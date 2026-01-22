package se.lnu.scarf;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
public class ScarfController {
    @GetMapping({"/", "/{id}"})
    public String index(
            @PathVariable(value = "id", required = false) String id,
            Model model
    ) {
        if(id != null) model.addAttribute("id", id);
        return "index";
    }

    @GetMapping("/results/{resultId}")
    public String results(@PathVariable(value = "resultId", required = false) String resultId, Model model) {
        if(resultId != null) model.addAttribute("resultId", resultId);
        return "results";
    }
}
