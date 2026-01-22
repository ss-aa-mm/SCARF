document.addEventListener('DOMContentLoaded', () => {
    const ERROR_PREFIX = "ERROR:0:";
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
    const buttons = [runBtn, browseFileBtn];

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

        setEnabled(buttons, false);
        const response = await fetch("/interpretation", {
            method: 'POST',
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            updateSimState(ERROR_PREFIX + errorText);
            setEnabled(buttons, true);
            return;
        }

        const eventSource = new EventSource('/progression');

        eventSource.onmessage = (event) => {
            updateSimState(event.data, eventSource);
        }
        eventSource.onerror = (error) => {
            updateSimState(ERROR_PREFIX + (error?.data ?? "Something unexpected happened!"));
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

    function updateSimState(eventData, evtSource = null) {
        const [header, percentText, ...rest] = eventData.split(":");
        const labelText = rest.join(":");
        const stages = [
            [h => h.startsWith("STAGE_"),
                (p, l) => {
                    barColor("blue");
                    bar.style.width = `${p}%`;
                    label.innerText = l;
                    percent.innerText = `${p}%`;
                }],
            [h => h.startsWith("SUCCESS"),
                (p, l) => {
                    barColor("green");
                    bar.style.width = `${p}%`;
                    label.innerText = l;
                    percent.innerText = `${p}%`;
                    setEnabled(buttons, true);
                    evtSource.close();
                }],
            [h => h.startsWith("ERROR"),
                (p, l) => {
                    barColor("red");
                    label.innerText = l;
                    setEnabled(buttons, true);
                    if (evtSource != null) evtSource.close();
                }],
        ];
        const action = stages.find(([predicate]) => predicate(header));
        action?.[1](percentText, labelText);
    }

    function setEnabled(buttons, enabled) {
        buttons.forEach((btn) => {
            btn.disabled = !enabled;
            [...btn.classList].forEach((cls) => {
                if (!enabled && cls.startsWith("btn-") && !cls.endsWith("-disabled")) {
                    btn.classList.replace(cls, `${cls}-disabled`);
                } else if (enabled && cls.endsWith("-disabled")) {
                    btn.classList.replace(cls, cls.replace(/-disabled$/, ''));
                }
            });
        });
    }

    function barColor(color) {
        [bar, label].forEach(el => {
            [...el.classList].forEach(cls => {
                const match = cls.match(/^(text|bg)-[^-]+-(.+)$/);
                if (match) {
                    el.classList.replace(cls, `${match[1]}-${color}-${match[2]}`);
                }
            });
        });
    }
});


