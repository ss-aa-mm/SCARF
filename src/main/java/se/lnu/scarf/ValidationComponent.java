package se.lnu.scarf;

import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EPackage;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.util.EcoreUtil;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceFactoryImpl;
import org.eclipse.uml2.uml.Model;
import org.eclipse.uml2.uml.Profile;
import org.eclipse.uml2.uml.ProfileApplication;
import org.eclipse.uml2.uml.UMLPackage;
import org.eclipse.uml2.uml.resources.util.UMLResourcesUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;

@Component
public class ValidationComponent {

    private static final Logger logger = LoggerFactory.getLogger(ValidationComponent.class);

    public Model resolveAndValidate(byte[] file, String fileName) throws IOException {
        logger.info("Starting profile resolution and model validation...");
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
        assert fileName != null;
        Resource resource = resourceSet.createResource(URI.createURI(fileName));
        try (InputStream in = new ByteArrayInputStream(file) ) {
            resource.load(in, null);
        }
        if (resource.getContents().isEmpty()) return null;
        Model umlModel = (Model) EcoreUtil.getObjectByType(resource.getContents(), UMLPackage.Literals.MODEL);
        for (ProfileApplication pa : new ArrayList<>(umlModel.getProfileApplications())) {
            umlModel.getProfileApplications().remove(pa);
        }
        resourceSet.getURIConverter().getURIMap().put(profileSampleURI, URI.createURI(NsURI));
        umlModel.applyProfile(profileRoot);
        EcoreUtil.resolveAll(resourceSet);
        logger.info("The model has {} stereotype(s) applied.",
                umlModel.allOwnedElements().stream().mapToInt(e -> e.getAppliedStereotypes().size()).sum());
        return umlModel;
    }
}
