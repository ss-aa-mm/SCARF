package se.lnu.scarf;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Component
public class ResultsCreationComponent{
    private static final Logger logger = LoggerFactory.getLogger(ResultsCreationComponent.class);

    public void saveResults(Path resultsDirectory, String packageName) throws IOException {
        logger.info("Saving simulation results...");
        Path persistentDirectory = Paths.get("results").toAbsolutePath();
        if (!Files.exists(persistentDirectory)) Files.createDirectories(persistentDirectory);
        Path resultsPath = resultsDirectory.resolve(packageName + "_plot.json");
        String simulationId = resultsDirectory.getFileName().toString().substring("scarf-gen-src".length());
        Files.copy(
                resultsPath,
                persistentDirectory.resolve(simulationId + ".json"),
                StandardCopyOption.REPLACE_EXISTING
        );
        logger.info("{} successfully created!", simulationId + ".json");
    }
}
