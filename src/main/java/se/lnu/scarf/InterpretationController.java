package se.lnu.scarf;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
public class InterpretationController {

    private final InterpretationService interpretationService;

    public InterpretationController(InterpretationService interpretationService) {
        this.interpretationService = interpretationService;
    }

    @PostMapping("/interpretation")
    public ResponseEntity<String> runInterpretation(
            @RequestParam("file") MultipartFile umlFile
    ) {
        if (umlFile.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("File is empty");
        }

        try {
            String serviceResult = interpretationService.interpret(umlFile);
            return ResponseEntity.status(HttpStatus.OK).body(serviceResult);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
        }

    }
}
