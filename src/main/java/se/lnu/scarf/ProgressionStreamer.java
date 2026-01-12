package se.lnu.scarf;

import org.springframework.stereotype.Component;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

@Component
public class ProgressionStreamer {

    private final Sinks.Many<String> sink = Sinks.many().replay().limit(10);

    public void push(String stage, int percentage, String label) {
        sink.tryEmitNext(String.format("%s:%d:%s", stage, percentage, label));
    }

    public Flux<String> getFlux() {
        return sink.asFlux();
    }
}
