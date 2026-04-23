package se.lnu.scarf;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class LaunchValidator {
    private static final String compiledInterpretation = "static/main.emtl";
    private static final String compiledStyleSheet = "static/css/output.css";
    private static final String generatedGci = "static/gci.json";
    private static boolean useSampleGci = false;

    @PostConstruct
    public void checkInit() {
        validateResource(compiledInterpretation, "Compiled Acceleo Interpretation (EMTL)", true);
        validateResource(compiledStyleSheet, "Compiled Style Sheet (CSS)", true);
        validateResource(generatedGci, "GCI Dataset (JSON)", false);
    }

    private void validateResource(String path, String description, boolean required) {
        ClassPathResource classPathResource = new ClassPathResource(path);
        if (!classPathResource.exists()) {
            if(required) {
                log.error("CRITICAL: {} not found at classpath: {}", description, path);
                throw new RuntimeException(description + " is missing from classpath. Check the pipeline and retry!");
            } else {
                log.warn("{} not found at classpath: {}. Static defaults will be used!", description, path);
                useSampleGci = true;
            }
        } else {
            log.info("Found {} at classpath: {}", description, path);
        }
    }

    public boolean usingSampleGci() {
        return useSampleGci;
    }
}
