# <img src="src/main/resources/static/images/favicon.png" alt="SCARFLogo" width="80" style="vertical-align: middle;"> SCARF: Software-as-a-Service Carbon-Aware Reasoning Framework
[![Build Status](https://img.shields.io/github/actions/workflow/status/ss-aa-mm/SCARF/ci.yml)](https://github.com/ss-aa-mm/SCARF/actions)
[![License](https://img.shields.io/github/license/ss-aa-mm/SCARF)](LICENSE)
[![SciUML Version](https://img.shields.io/badge/dynamic/xml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fss-aa-mm%2FSCARF%2Frefs%2Fheads%2Fmaster%2Fsrc%2Fmain%2Fresources%2Fstatic%2Fsci-uml.profile.uml&query=%28%2F%2F*%5Blocal-name()%3D'contents'%5D%2F*%5Blocal-name()%3D'eAnnotations'%20and%20%40source='PapyrusVersion'%5D%2F*%5Blocal-name()%3D'details'%20and%20%40key='Version'%5D%29%5B1%5D%2F%40value&label=SciUML%20version)](src/main/resources/static/sci-uml.profile.uml)

### Prerequisites
* Install [JDK 17](https://www.oracle.com/java/technologies/downloads/) or later
### Running instructions
* Clone this repo on your local machine and open a Terminal/PowerShell window in the root folder
* Run `./mvnw spring-boot:run` on macOS/Linux or `mvnw spring-boot:run` on Windows to start the application on `localhost:9090`