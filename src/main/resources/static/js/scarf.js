document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById("fileInput");
    const browseFileBtn = document.getElementById("browseFileBtn");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const distSelect = document.getElementById("distSelect");
    const param1Label = document.getElementById('param1Label');
    const param2Label = document.getElementById('param2Label');
    const param2Field = document.getElementById('param2Field');
    const runBtn = document.getElementById('runBtn');
    const out = document.getElementById('consoleOutput');

    browseFileBtn.addEventListener('click', () => {
        fileInput.click();
    });

    runBtn.addEventListener('click', async () => {
        if (!fileInput.files.length) return alert("Select a model first!");

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        runBtn.disabled = true;
        runBtn.classList.remove("btn-green");
        runBtn.classList.add("btn-disabled")
        try {
            const response = await fetch("/interpretation", {
                method: 'POST',
                body: formData
            });
            if (!response.ok) appendOut(out, "Something unexpected happened!");
            const text = await response.text();
            appendOut(out, text);
        } catch (err) {
            appendOut(out, "Failed: " + err.message);
        } finally {
            runBtn.disabled = false;
            runBtn.classList.add("btn-green");
            runBtn.classList.remove("btn-disabled")
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
});

function appendOut(outField, output) {
    const text = outField.textContent;
    outField.textContent = text + '\n' + output;
}
