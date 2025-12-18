package se.lnu.scarf;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.file.Path;

@Component
public class ExecutionComponent {
    private static final Logger logger = LoggerFactory.getLogger(ExecutionComponent.class);

    public void execute(Path baseFolder, String mainClassQualifiedName) throws Exception {
        logger.info("Starting code execution...");
        logger.info("Targeting {}", mainClassQualifiedName);
        Path classesFolder = baseFolder.resolve("target/classes");
        Path libFolder = baseFolder.resolve("lib");
        String libJars = libFolder + File.separator + "*";
        String classpath = classesFolder + File.pathSeparator + libJars;
        logger.info(classpath);

        ProcessBuilder processBuilder = new ProcessBuilder(
                "java",
                "-Xmx2g",
                "-cp", classpath,
                mainClassQualifiedName
        );
        processBuilder.directory(baseFolder.toFile());
        processBuilder.inheritIO();
        Process process = processBuilder.start();
        logger.info("Executing simulation...");
        process.waitFor();
    }
}