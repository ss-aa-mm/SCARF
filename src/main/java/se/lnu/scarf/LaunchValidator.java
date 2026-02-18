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

    @PostConstruct
    public void checkInit() {
        if (!Files.exists(compiledInterpretation)) {
            throw new RuntimeException("Compiled interpretation not found");
        }
        if (!Files.exists(compiledStyleSheet)) {
            throw new RuntimeException("Compiled stylesheet not found");
        }
        log.info("Found the required generated sources. Launching the application...");
    }
}
