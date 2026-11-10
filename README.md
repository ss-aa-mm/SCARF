# <img src="src/main/resources/static/images/favicon.png" alt="SCARFLogo" width="80" style="vertical-align: middle;"> SCARF: Software-as-a-Service Carbon-Aware Reasoning Framework
[![Build Status](https://img.shields.io/github/actions/workflow/status/ss-aa-mm/SCARF/ci.yml)](https://github.com/ss-aa-mm/SCARF/actions)
[![License](https://img.shields.io/github/license/ss-aa-mm/SCARF)](LICENSE)
[![SciUML Version](https://img.shields.io/badge/dynamic/xml?url=https%3A%2F%2Fraw.githubusercontent.com%2Fss-aa-mm%2FSCARF%2Frefs%2Fheads%2Fmaster%2Fsrc%2Fmain%2Fresources%2Fstatic%2Fsci-uml.profile.uml&query=%28%2F%2F*%5Blocal-name()%3D'contents'%5D%2F*%5Blocal-name()%3D'eAnnotations'%20and%20%40source='PapyrusVersion'%5D%2F*%5Blocal-name()%3D'details'%20and%20%40key='Version'%5D%29%5B1%5D%2F%40value&label=SciUML%20version)](src/main/resources/static/sci-uml.profile.uml)

## About
SCARF is a Carbon-Aware Reasoning Framework implementation for Software-as-a-Service architectures. It leverages [Acceleo](https://eclipse.dev/acceleo/) and [CloudSim Plus](https://cloudsimplus.org) to provide carbon-aware decision support in the design of SaaS, taking a UML-based <i>[Architecture Description](#saas-architecture-description)</i> as input.

## Prerequisites
* Java Development Kit (JDK) 25 or later. You can download it from [Oracle](https://www.oracle.com/java/technologies/downloads/).

## Getting Started 
SCARF can run in two modes:

### SpringBoot Standalone execution
1) Clone this repository to your local machine and open a Terminal (macOS/Linux) or PowerShell (Windows) in the project root directory.
2) Start the application:
   * <b>macOS/Linux</b> `./mvnw spring-boot:run`
   * <b>Windows</b> `mvnw.cmd spring-boot:run`
3) The application will be accessible on http://localhost:9090

<b>Please note that the Python-based outputs will be disabled when running in this mode!</b>

### Through a Docker Container
<b>Note: It requires a Docker daemon running in the background and a Docker Compose installation. [Docker Desktop](https://www.docker.com/products/docker-desktop/) is recommended to run in this mode.</b>
1) Clone this repository to your local machine and open a Terminal (macOS/Linux) or PowerShell (Windows) in the project root directory.
2) Build the containerized environment and start the application (it may take some time the first time it is launched):
   * `docker compose up`
3) The application will be accessible on http://localhost:9095


## SaaS Architecture Description
Use a UML editor ([Eclipse Papyrus](https://eclipse.dev/papyrus/) is the recommended choice for its full compatibility with OCL/EMF syntax) to create a compatible input <i>Architecture Description</i>. It must apply the latest [SciUML Profile](src/main/resources/static/sci-uml.profile.uml) and satisfy its <i>Analytic Constraints</i>. An example eligible input is found [here](examples/PetClinic-SpringMVC-3Nodes/PetClinic-SpringMVC.uml).
