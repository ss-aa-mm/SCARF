document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById("fileInput");
    const browseFileBtn = document.getElementById("browseFileBtn");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const distSelect = document.getElementById("distSelect");
    const param1Label = document.getElementById('param1Label');
    const param2Label = document.getElementById('param2Label');
    const param1Field = document.getElementById('param1Field');
    const param2Field = document.getElementById('param2Field');
    const runBtn = document.getElementById('runBtn');
    const repetitions = document.getElementById('repetitions');
    const bar = document.getElementById('progress-bar');
    const percent = document.getElementById('progress-percent');
    const label = document.getElementById('progress-label');

    browseFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    runBtn.addEventListener('click', async () => {
        if (!fileInput.files.length) return alert("Select a model first!");
        const isSecondParamRequired = !param2Field.classList.contains("invisible");
        if (!repetitions.value ||
            !distSelect.value ||
            !param1Field.value ||
            (!param2Field.value && isSecondParamRequired))
            return alert("Please set all the required simulation parameters first!")

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);
        formData.append("repetitions", repetitions.value);
        formData.append("distribution", distSelect.value);
        formData.append("param1", param1Field.value);
        formData.append("param2", isSecondParamRequired ? param2Field.value : 0);

        runBtn.disabled = true;
        runBtn.classList.add("btn-disabled")

        try {
            const response = await fetch("/interpretation", {
                method: 'POST',
                body: formData
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText);
            }
        } catch (err) {
            barError(err.message);
            runBtn.disabled = false;
            runBtn.classList.remove("btn-disabled");
            return;
        }

        const eventSource = new EventSource('/progression');

        eventSource.onmessage = (event) => {
            const data = event.data;

            if(data.startsWith("STAGE_") || data.startsWith("SUCCESS")) {
                const [_, percentText, labelText] = data.split(":");

                bar.style.width = `${percentText}%`;
                label.innerText = labelText;
                percent.innerText = `${percentText}%`;
                if(data.startsWith("STAGE_"))
                    bar.classList.add("running-glow");
                else {
                    eventSource.close();
                    bar.classList.remove("running-glow");
                    label.classList.remove("text-blue-400");
                    label.classList.add("text-green-400");
                    bar.classList.remove("bg-blue-500");
                    bar.classList.add("bg-green-500");
                    runBtn.disabled = false;
                    runBtn.classList.remove("btn-disabled");
                }
            } else {
                const [, , labelText] = data.split(":");
                barError(labelText);
                eventSource.close();
                bar.classList.remove("running-glow");
                runBtn.disabled = false;
                runBtn.classList.remove("btn-disabled");
            }
        }
    });

    fileInput.addEventListener('change', (evt) => {
        const selectedFile = evt.target.files[0];
        fileNameDisplay.placeholder = selectedFile.name;
    });

    distSelect.addEventListener('change', () => {
        const value = distSelect.value;
        param2Label.classList.add('invisible');
        param2Field.classList.add('invisible');

        switch (value) {
            case 'Exponential':
            case 'Constant':
                param1Label.textContent = "Rate:";
                break;
            case 'Uniform':
                param1Label.textContent = "Min:";
                param2Label.textContent = "Max:";
                param2Label.classList.remove('invisible');
                param2Field.classList.remove('invisible');
                break;
            case 'Erlang':
                param1Label.textContent = "Shape (k):";
                param2Label.textContent = "Rate:";
                param2Label.classList.remove('invisible');
                param2Field.classList.remove('invisible');
                break;
            case 'Log-normal':
                param1Label.textContent = "Log-mean (μ):";
                param2Label.textContent = "Log-std (σ):";
                param2Label.classList.remove('invisible');
                param2Field.classList.remove('invisible');
                break;
        }
    });

    function barError(message) {
        label.innerText = message;
        label.classList.remove("text-blue-400");
        label.classList.add("text-red-400");
        bar.classList.remove("bg-blue-500");
        bar.classList.add("bg-red-500");
    }
});


