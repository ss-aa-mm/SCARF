package se.lnu.scarf;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.file.Files;
import java.nio.file.Path;

@Slf4j
@Component
public class LaunchValidator {
    private static final Path compiledInterpretation = Path.of("src/main/resources/static/main.emtl");
    private static final Path compiledStyleSheet = Path.of("src/main/resources/static/css/output.css");
    private static final Path generatedGci = Path.of("src/main/resources/static/gci.json");

    @PostConstruct
    public void checkInit() {
        if (!Files.exists(compiledInterpretation)) {
            log.error("Could not find main.emtl!");
            throw new RuntimeException("Compiled interpretation not found");
        }
        if (!Files.exists(compiledStyleSheet)) {
            log.error("Could not find output.css!");
            throw new RuntimeException("Compiled stylesheet not found");
        }
        if (!Files.exists(generatedGci)) {
            log.warn("Could not find gci.json! Static defaults will be used!");
        }
        log.info("Found the required generated sources. Launching the application...");
    }
}
