package se.lnu.scarf;

import org.eclipse.uml2.uml.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@Service
public class ReasoningFrameworkService {

    private final ValidationComponent validationComponent;
    private final InterpretationComponent interpretationComponent;

    public ReasoningFrameworkService(ValidationComponent validationComponent,
                                     InterpretationComponent interpretationComponent) {
        this.validationComponent = validationComponent;
        this.interpretationComponent = interpretationComponent;
    }

    public FrameworkResult run(MultipartFile file, Integer rep, String distribution, Double p1, Double p2) {
        try {
            Model umlModel = validationComponent.resolveAndValidate(file);
            if (umlModel == null) return FrameworkResult.failure("Model could not be resolved or validated");

            String interpretationResult = interpretationComponent.interpret(umlModel, rep, distribution, p1, p2);
            return FrameworkResult.success(interpretationResult);
        } catch (IOException e) {
            return FrameworkResult.failure(e.getMessage());
        }
    }
}
