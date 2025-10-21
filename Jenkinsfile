node {
    stage("Cloning") {
        checkout scm
    }

    stage("Node Build & Test") {
        sh '''
        echo "Checking Node.js and npm versions..."
        node -v
        npm -v

        echo "Setting npm registry to avoid timeout issues..."
        npm config set registry https://registry.npmjs.org/

        echo "Installing dependencies with retry logic..."
        npm ci --no-audit --no-fund --prefer-offline || npm ci --no-audit --no-fund --prefer-offline

        echo "Running tests with --detectOpenHandles to avoid hanging..."
        npm test -- --detectOpenHandles || true
        '''
    }

    stage("Build & Push Image") {
        sh '''
        echo "Building Docker image..."
        docker build -t aman932/node-bmi-metrics:01 .

        echo "Saving image tag..."
        echo "aman932/node-bmi-metrics:01" > image.tag

        echo "Logging into Docker Hub..."
        docker login -u $DOCKERHUB_USER -p $DOCKERHUB_PASS

        echo "Pushing image to Docker Hub..."
        docker push aman932/node-bmi-metrics:01
        '''
    }

    stage("Helm Deploy to OpenShift") {
        sh '''
        echo "Deploying with Helm..."
        helm upgrade --install bmi-chart helm/bmi-app --namespace aman-3101-dev --create-namespace
        '''
    }

    stage("Pods") {
        sh '''
        echo "Checking pod status..."
        kubectl get pods
        sleep 10
        '''
    }

    stage("Testing") {
        script {
            def podStatus = sh(script: 'kubectl get pods | grep ".*bmi-app.*" | grep "Running"', returnStatus: true)
            if (podStatus == 0) {
                currentBuild.result = "SUCCESS"
            } else {
                currentBuild.result = "FAILURE"
            }
        }
    }

    stage("Approval") {
        script {
            if (env.CHANGE_ID && (currentBuild.result == "SUCCESS" || currentBuild.result == null)) {
                input message: "Everything correct, do you want to merge?", ok: "Merge"
            }
        }
    }

    stage("Done") {
        script {
            if (currentBuild.result == "SUCCESS" || currentBuild.result == null) {
                sh '''
                echo "Everything is working correct!"
                helm uninstall bmi-chart || echo "Release not found, skipping uninstall"
                '''
            } else {
                echo "Build failed — skipping downstream job."
            }
        }
    }
