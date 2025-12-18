package se.lnu.scarf;

import org.eclipse.uml2.uml.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import se.lnu.scarf.data.FrameworkResult;

import java.nio.file.Path;

@Service
public class ReasoningFrameworkService {

    private final ValidationComponent validationComponent;
    private final InterpretationComponent interpretationComponent;
    private final CompilationComponent compilationComponent;

    public ReasoningFrameworkService(ValidationComponent validationComponent,
                                     InterpretationComponent interpretationComponent,
                                     CompilationComponent compilationComponent) {
        this.validationComponent = validationComponent;
        this.interpretationComponent = interpretationComponent;
        this.compilationComponent = compilationComponent;
    }

    public FrameworkResult run(MultipartFile file, Integer rep, String distribution, Double p1, Double p2) {
        try {
            Model umlModel = validationComponent.resolveAndValidate(file);
            if (umlModel == null) return FrameworkResult.failure("The provided UML model could not be resolved or validated");

            Path compilationBaseDir = interpretationComponent.interpret(umlModel, rep, distribution, p1, p2);
            if (compilationBaseDir == null) return FrameworkResult.failure("The provided UML model could not be interpreted");

            int result = compilationComponent.compile(compilationBaseDir);
            if (result != 0) return FrameworkResult.failure("The generated code compilation failed");
            return FrameworkResult.success("ok");
        } catch (Exception e) {
            return FrameworkResult.failure(e.getMessage());
        }
    }
}
