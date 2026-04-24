package se.lnu.scarf;

import org.eclipse.uml2.uml.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.nio.file.Path;

@Service
public class ReasoningFrameworkService {

    private final ValidationComponent validationComponent;
    private final InterpretationComponent interpretationComponent;
    private final CompilationComponent compilationComponent;
    private final ExecutionComponent executionComponent;
    private final ResultsCreationComponent resultsCreationComponent;
    private final ProgressionStreamer streamer;
    private final LaunchValidator launchValidator;
    private static final String DELIMITER = "|";
    private static final Logger logger = LoggerFactory.getLogger(ReasoningFrameworkService.class);

    public ReasoningFrameworkService(ValidationComponent validationComponent,
                                     InterpretationComponent interpretationComponent,
                                     CompilationComponent compilationComponent,
                                     ExecutionComponent executionComponent,
                                     ResultsCreationComponent resultsCreationComponent,
                                     LaunchValidator launchValidator,
                                     ProgressionStreamer streamer) {
        this.validationComponent = validationComponent;
        this.interpretationComponent = interpretationComponent;
        this.compilationComponent = compilationComponent;
        this.executionComponent = executionComponent;
        this.resultsCreationComponent = resultsCreationComponent;
        this.launchValidator = launchValidator;
        this.streamer = streamer;
    }

    @Async("frameworkExecutor")
    public void runAsync(byte[] file, String originalFilename, Integer rep, String distribution, Double p1, Double p2) {
        try {
            streamer.push("STAGE_VALIDATION", 5, "Validating UML Architecture...");
            Model umlModel = validationComponent.resolveAndValidate(file, originalFilename);
            if (umlModel == null) throw new RuntimeException("The provided UML model could not be resolved or validated");

            streamer.push("STAGE_INTERPRETATION", 25, "Running Interpretation...");
            Path compilationBaseDir = interpretationComponent.interpret(umlModel, rep, distribution, p1, p2);
            if (compilationBaseDir == null) throw new RuntimeException("The provided UML model could not be interpreted");
            validationComponent.clearResourceSet();

            streamer.push("STAGE_COMPILATION", 50, "Compiling the generated simulation...");
            int result = compilationComponent.compile(
                    compilationBaseDir,
                    launchValidator.usingSampleGci(),
                    launchValidator.isRunningInContainer()
            );
            if (result != 0) throw new RuntimeException("The generated code compilation failed");

            streamer.push("STAGE_EXECUTION", 75, "Executing the generated simulation for " + rep + " repetitions...");
            executionComponent.execute(compilationBaseDir, interpretationComponent.getMainClassQualifiedName());

            streamer.push("STAGE_SAVING_RESULTS", 95, "Saving the simulation results...");
            String simId = resultsCreationComponent.saveResults(
                    compilationBaseDir,
                    interpretationComponent.getPackageName(),
                    launchValidator.getDataDirectory()
            );

            streamer.push("SUCCESS", 100, "Reasoning Framework successfully executed!" + DELIMITER + simId);

        } catch (Exception e) {
            logger.error(e.getMessage());
            streamer.push("ERROR", 0, e.getMessage());
        }

    }
}
