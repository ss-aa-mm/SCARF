package se.lnu.scarf;

import org.eclipse.acceleo.engine.service.AbstractAcceleoGenerator;
import org.eclipse.acceleo.model.mtl.Module;
import org.eclipse.acceleo.model.mtl.MtlPackage;
import org.eclipse.emf.common.util.URI;
import org.eclipse.emf.ecore.EObject;
import org.eclipse.emf.ecore.resource.Resource;
import org.eclipse.emf.ecore.resource.ResourceSet;
import org.eclipse.emf.ecore.resource.impl.ResourceSetImpl;
import org.eclipse.emf.ecore.xmi.impl.XMIResourceFactoryImpl;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.List;

public class SimulationGenerator extends AbstractAcceleoGenerator {
    public static final String MODULE_FILE_NAME = "main";
    public static final String[] TEMPLATE_NAMES = { "projectGenerator" };
    private final ResourceSet rs = new ResourceSetImpl();

    @Override
    public String getModuleName() {
        return MODULE_FILE_NAME;
    }

    @Override
    public String[] getTemplateNames() {
        return TEMPLATE_NAMES;
    }

    public SimulationGenerator(EObject model, File targetFolder, List<?> arguments)  throws IOException {
        initialize(model, targetFolder, arguments);
    }

    public void clear() {
        this.module = null;
        this.targetFolder = null;
        this.model = null;
        this.generationArguments = null;
        for (Resource res : new ArrayList<>(this.rs.getResources())) {
            res.unload();
        }
        rs.getResources().clear();
        rs.eAdapters().clear();
        rs.setResourceFactoryRegistry(null);
    }

    @Override
    public void initialize(EObject model, File targetFolder, List<?> arguments) throws IOException{
        try {
            super.initialize(model, targetFolder, arguments);
        } catch (Exception e) {
            InputStream is = getClass().getClassLoader().getResourceAsStream("static/main.emtl");
            File tempFile = File.createTempFile("main-", ".emtl");
            tempFile.deleteOnExit();
            assert is != null;
            Files.copy(is, tempFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            URI moduleURI = URI.createFileURI(tempFile.getAbsolutePath());
            MtlPackage.eINSTANCE.eClass();
            rs.getResourceFactoryRegistry().getExtensionToFactoryMap().put("emtl", new XMIResourceFactoryImpl());
            Resource emtlResource = rs.getResource(moduleURI, true);

            this.module = (Module) emtlResource.getContents().get(0);
            this.targetFolder = targetFolder;
            this.model = model;
            this.generationArguments = arguments;
        }
    }
}
