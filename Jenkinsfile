pipeline {
    agent any

    environment {
        DOCKER_IMAGE = "aman932/node-bmi-metrics:01"
        DOCKER_REGISTRY = "docker.io"
        NPM_REGISTRY = "https://registry.npmjs.org/"
    }

    stages {
        stage('Cloning') {
            steps {
                checkout scm
            }
        }

        stage('Node Build & Test') {
            steps {
                sh '''
                echo "Checking Node.js and npm versions..."
                node -v
                npm -v

                echo "Setting npm registry..."
                npm config set registry $NPM_REGISTRY

                echo "Installing dependencies..."
                npm ci --no-audit --no-fund --prefer-offline

                echo "Running tests (force exit to avoid hangs)..."
                npm test -- --runInBand --forceExit
                '''
            }
        }

        stage('Build & Push Image') {
            steps {
                sh '''
                echo "Building Docker image..."
                docker build -t $DOCKER_IMAGE .

                echo "Logging into Docker Hub..."
                echo $DOCKERHUB_PASS | docker login -u $DOCKERHUB_USER --password-stdin

                echo "Pushing image to Docker Hub..."
                docker push $DOCKER_IMAGE
                '''
            }
        }

        stage('Helm Deploy to OpenShift') {
            steps {
                sh '''
                echo "Deploying with Helm..."
                helm upgrade --install bmi-chart helm/bmi-app \
                    --namespace aman-3101-dev --create-namespace \
                    --set image.repository=$DOCKER_IMAGE
                '''
            }
        }

        stage('Verify Pods') {
            steps {
                sh '''
                echo "Checking pod status..."
                kubectl get pods -n aman-3101-dev
                sleep 10
                '''
            }
        }

        stage('Approval') {
            when {
                expression { env.CHANGE_ID && currentBuild.result == null }
            }
            steps {
                input message: "Everything correct, do you want to merge?", ok: "Merge"
            }
        }

        stage('Cleanup') {
            steps {
                sh '''
                echo "Cleaning up Helm release..."
                helm uninstall bmi-chart -n aman-3101-dev || echo "Release not found, skipping"
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Pipeline completed successfully!"
        }
        failure {
            echo "❌ Pipeline failed. Check logs for details."
        }
    }
}
