FROM eclipse-temurin:25-jdk AS build

WORKDIR /app
COPY mvnw .
COPY .mvn/ .mvn/
COPY pom.xml .
COPY local-dependencies/ local-dependencies/
RUN chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw --batch-mode -U dependency:go-offline

COPY . .
RUN --mount=type=cache,target=/root/.m2 \
    ./mvnw --batch-mode package -DskipTests

FROM eclipse-temurin:25-jdk

# Install Python and pip
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build /app/target/*.jar app.jar
COPY src/main/resources/python/ ./python/

# Install Matplotlib in an isolated virtual environment
RUN python3 -m venv /opt/python \
    && /opt/python/bin/pip install --no-cache-dir -r /app/python/requirements.txt

ENV PATH="/opt/python/bin:${PATH}"

EXPOSE 9090

ENTRYPOINT ["java", "-jar", "app.jar"]