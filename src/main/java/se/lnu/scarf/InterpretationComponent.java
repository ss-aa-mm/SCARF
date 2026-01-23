package se.lnu.scarf;

import lombok.Getter;
import org.eclipse.emf.common.util.BasicMonitor;
import org.eclipse.uml2.uml.Model;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

@Getter
@Component
public class InterpretationComponent {

    private static final Logger logger = LoggerFactory.getLogger(InterpretationComponent.class);
    private String mainClassQualifiedName;
    private String packageName;

    public Path interpret(Model umlModel, Integer rep, String distribution, Double p1, Double p2) throws IOException {
        logger.info("Interpreting the UML model...");
        Path baseDir = Files.createTempDirectory("scarf-gen-src");
        File targetFolder = baseDir.toFile();
        targetFolder.deleteOnExit();
        packageName =  cleanModelName(umlModel.getName());
        mainClassQualifiedName = packageName + "." +
                Character.toUpperCase(packageName.charAt(0)) +
                packageName.substring(1);
        File sourceFolder = new File(targetFolder, "src/main/java");
        File packageFolder = new File(sourceFolder, packageName);
        if(!packageFolder.mkdirs() && !packageFolder.exists()) throw new IOException("Could not create folder "
                + packageFolder.getAbsolutePath());

        SimulationGenerator acceleoGenerator = new SimulationGenerator(umlModel, packageFolder,
                new ArrayList<Object>(List.of(rep, distribution, p1, p2))
        );
        acceleoGenerator.doGenerate(new BasicMonitor());
        logger.info("Code generation complete.");
        acceleoGenerator.clear();
        return baseDir;
    }

    private static String cleanModelName(String modelName) {
        if (modelName == null || modelName.isEmpty()) return modelName;
        return modelName.toLowerCase().replaceAll("[^a-zA-Z0-9_]", "");
    }

}
