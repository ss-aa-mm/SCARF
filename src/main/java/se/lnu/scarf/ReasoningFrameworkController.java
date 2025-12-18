package se.lnu.scarf;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import se.lnu.scarf.data.FrameworkResult;

@RestController
public class ReasoningFrameworkController {

    private final ReasoningFrameworkService reasoningFrameworkService;

    public ReasoningFrameworkController(ReasoningFrameworkService reasoningFrameworkService) {
        this.reasoningFrameworkService = reasoningFrameworkService;
    }

    @PostMapping("/interpretation")
    public ResponseEntity<String> runFramework(
            @RequestParam("file") MultipartFile umlFile,
            @RequestParam("repetitions") Integer repetitions,
            @RequestParam("distribution") String interArrivalDistribution,
            @RequestParam("param1") Double param1,
            @RequestParam("param2") Double param2
            ) {
        if (umlFile.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File is empty");
        }

        FrameworkResult serviceResult = reasoningFrameworkService.run(
                umlFile,
                repetitions,
                interArrivalDistribution,
                param1,
                param2
        );
        return serviceResult.success()
                ? ResponseEntity.ok(serviceResult.message())
                : ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(serviceResult.message());

    }
}
