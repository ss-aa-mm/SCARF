package se.lnu.scarf;

import org.eclipse.emf.common.util.BasicMonitor;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EPackage;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceFactoryImpl;
import org.eclipse.uml2.uml.*;
import org.eclipse.uml2.uml.resources.util.UMLResourcesUtil;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class InterpretationService {

    public String interpret(MultipartFile file) throws Exception {
        System.out.println("Starting interpretation");
        ResourceSet resourceSet = new ResourceSetImpl();
        UMLResourcesUtil.init(resourceSet);
        resourceSet.getResourceFactoryRegistry().getExtensionToFactoryMap().put("uml", new XMIResourceFactoryImpl());
        URI profileSampleURI = URI.createURI("sci-uml.profile.uml");
        Resource profileResource = resourceSet.createResource(profileSampleURI);
        try (InputStream profileIn = Thread.currentThread()
                .getContextClassLoader().getResourceAsStream("static/sci-uml.profile.uml")) {
            profileResource.load(profileIn, null);
        }
        Profile profileRoot = (Profile) EcoreUtil.getObjectByType(profileResource.getContents(), UMLPackage.Literals.PACKAGE);
        profileRoot.define();
        profileRoot.setURI("http://lnu.se/sciuml");
        String NsURI = profileRoot.getDefinition().getNsURI();
        EPackage.Registry.INSTANCE.put(NsURI, profileRoot.getDefinition());
        String fileName = file.getOriginalFilename();
        assert fileName != null;
        Resource resource = resourceSet.createResource(URI.createURI(fileName));
        resource.load(file.getInputStream(), null);
        if (resource.getContents().isEmpty()) throw new IllegalArgumentException("Empty file");
        Model umlModel = (Model) EcoreUtil.getObjectByType(resource.getContents(), UMLPackage.Literals.MODEL);
        for (ProfileApplication pa : new ArrayList<>(umlModel.getProfileApplications())) {
            umlModel.getProfileApplications().remove(pa);
        }
        resourceSet.getURIConverter().getURIMap().put(profileSampleURI, URI.createURI(NsURI));
        umlModel.applyProfile(profileRoot);
        EcoreUtil.resolveAll(resourceSet);
        System.out.println("The model has " +
                umlModel.allOwnedElements().stream().mapToInt(e -> e.getAppliedStereotypes().size()).sum() +
                " stereotype(s) applied.");
        Path srcDir = Files.createTempDirectory("scarf-gen-src");
        File targetFolder = srcDir.toFile();
        targetFolder.deleteOnExit();
        Main acceleoGenerator = new Main(umlModel, targetFolder,
                new ArrayList<Object>(
                        List.of(
                                "SampleFileName",
                                3,
                                "Exponential",
                                5.0,
                                5.0
                        )
                ));
        acceleoGenerator.doGenerate(new BasicMonitor());
        return umlModel.getOwnedElements().stream()
                .filter(Interaction.class::isInstance)
                .map(Interaction.class::cast)
                .map(Interaction::getName)
                .collect(Collectors.joining(", "));
    }
}
