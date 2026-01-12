package se.lnu.scarf;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import reactor.core.publisher.Flux;

import java.io.IOException;

@RestController
public class ReasoningFrameworkController {

    private final ReasoningFrameworkService reasoningFrameworkService;
    private final ProgressionStreamer streamer;

    public ReasoningFrameworkController(ReasoningFrameworkService reasoningFrameworkService, ProgressionStreamer streamer) {
        this.reasoningFrameworkService = reasoningFrameworkService;
        this.streamer = streamer;
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
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("The selected file is empty");
        }

        try {
            byte[] fileBytes = umlFile.getBytes();
            streamer.reset();

            reasoningFrameworkService.runAsync(
                    fileBytes,
                    umlFile.getOriginalFilename(),
                    repetitions,
                    interArrivalDistribution,
                    param1,
                    param2
            );
        } catch (IOException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Something went wrong");
        }

        return ResponseEntity.accepted().body("Reasoning Framework execution started");

    }

    @GetMapping(value = "/progression", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> getProgression() {
        return streamer.getFlux();
    }
}
