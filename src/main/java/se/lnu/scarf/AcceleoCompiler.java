package se.lnu.scarf;

import lombok.extern.slf4j.Slf4j;
import org.eclipse.acceleo.common.AcceleoCommonPlugin;
import org.eclipse.acceleo.model.mtl.MtlPackage;
import org.eclipse.acceleo.model.mtl.util.MtlResourceFactoryImpl;
import org.eclipse.acceleo.parser.AcceleoParser;
import org.eclipse.acceleo.parser.AcceleoSourceBuffer;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.URIConverter;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.xmi.XMLResource;
import org.eclipse.emf.ecore.xmi.impl.EcoreResourceFactoryImpl;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceFactoryImpl;
import org.eclipse.uml2.uml.UMLPackage;

import java.io.File;
import java.io.IOException;
import java.net.URL;
import java.util.*;

@Slf4j
@SuppressWarnings("deprecation")
public class AcceleoCompiler {
    private static final List<String> requiredLibraries = List.of("mtlstdlib.ecore", "mtlnonstdlib.ecore");

    public static void main(String[] args) {
        try {
            UMLPackage.eINSTANCE.eClass();
            mapLibraries();

            ResourceSet resourceSet = new ResourceSetImpl();
            resourceSet.getPackageRegistry().put(MtlPackage.eNS_URI, MtlPackage.eINSTANCE);
            resourceSet.getResourceFactoryRegistry().getExtensionToFactoryMap().put("mtl", new MtlResourceFactoryImpl());
            resourceSet.getResourceFactoryRegistry().getExtensionToFactoryMap().put("emtl", new XMIResourceFactoryImpl());
            resourceSet.getResourceFactoryRegistry().getExtensionToFactoryMap().put("ecore", new EcoreResourceFactoryImpl());

            File mtlSource = new File("src/main/resources/templates/main.mtl");
            File emtlDestination = new File("src/main/resources/static/main.emtl");
            URI outURI = URI.createFileURI(emtlDestination.getAbsolutePath());
            Resource emtlResource = resourceSet.createResource(outURI);

            AcceleoSourceBuffer acceleoSourceBuffer = new AcceleoSourceBuffer(mtlSource);
            AcceleoParser ap = new AcceleoParser();
            ap.parse(acceleoSourceBuffer, emtlResource, new ArrayList<>());

            Map<Object, Object> options = new HashMap<>();
            options.put(XMLResource.OPTION_FORMATTED, Boolean.TRUE);
            options.put(XMLResource.OPTION_DECLARE_XML, Boolean.TRUE);
            options.put(XMLResource.OPTION_ENCODING, "UTF-8");
            emtlResource.save(options);
            log.info("Compiled Interpretation generated at {}", emtlDestination.getAbsolutePath());
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }

    private static void mapLibraries() {
        for (String library : AcceleoCompiler.requiredLibraries) {
            URL libURL = AcceleoCommonPlugin.class.getResource("/model/" + library);
            assert libURL != null;
            URIConverter.URI_MAP.put(
                    URI.createURI(MtlPackage.eNS_URI + "/" + library),
                    URI.createURI(libURL.toString())
            );
        }
    }
}
