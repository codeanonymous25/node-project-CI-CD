
pipeline {
  agent any

  environment {
    SONAR_SERVER_NAME          = 'Sonar'
    SONAR_SCANNER_TOOL         = 'SonarScanner'
    DOCKERHUB_CREDENTIALS_ID   = 'dockerhub-creds'

    APP_NAME       = 'node-bmi-metrics'
    IMAGE_REPO     = 'docker.io/aman932/node-bmi-metrics'
    IMAGE_TAG      = "${BUILD_NUMBER}"
    K8S_NAMESPACE  = 'aman-3101-dev'
    NPM_REGISTRY   = 'https://registry.npmjs.org/'
  }

  options {
    timestamps()
    disableConcurrentBuilds()
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
          echo "Node & npm versions:"
          node -v
          npm -v

          echo "Setting npm registry..."
          npm config set registry "$NPM_REGISTRY"

          echo "Installing dependencies..."
          npm ci --no-audit --no-fund --prefer-offline

          echo "Running Jest tests (force exit to avoid open handles)..."
          npm test -- --runInBand --forceExit
        '''
      }
    }

    stage('SonarQube Analysis') {
      environment {
        SONAR_SCANNER_HOME = tool "${SONAR_SCANNER_TOOL}"
      }
      steps {
        withSonarQubeEnv("${SONAR_SERVER_NAME}") {
          sh '''
            echo "Running SonarQube analysis..."
            "$SONAR_SCANNER_HOME/bin/sonar-scanner"               -Dsonar.projectKey=node-bmi-metrics               -Dsonar.projectName=Node\ BMI\ Metrics               -Dsonar.sources=.               -Dsonar.host.url="$SONAR_HOST_URL"
          '''
        }
      }
    }

    stage('Quality Gate') {
      steps {
        timeout(time: 5, unit: 'MINUTES') {
          waitForQualityGate abortPipeline: true
        }
      }
    }

    stage('Build & Push Image') {
      when {
        expression {
          return !env.CHANGE_ID
        }
      }
      steps {
        withCredentials([usernamePassword(credentialsId: "${DOCKERHUB_CREDENTIALS_ID}", usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            set -e
            echo "Building Docker image..."
            docker build -t "${IMAGE_REPO}:${IMAGE_TAG}" -t "${IMAGE_REPO}:latest" .

            echo "Logging into Docker Hub (non-interactive)..."
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin

            echo "Pushing image tags..."
            docker push "${IMAGE_REPO}:${IMAGE_TAG}"
            docker push "${IMAGE_REPO}:latest"

            docker logout || true
          '''
        }
      }
    }

    stage('Helm Deploy to OpenShift') {
      when {
        expression {
          return !env.CHANGE_ID
        }
      }
      steps {
        sh '''
          echo "Helm upgrade/install..."
          helm upgrade --install bmi-chart helm/bmi-app             --namespace "${K8S_NAMESPACE}" --create-namespace             --set image.repository="${IMAGE_REPO}"             --set image.tag="${IMAGE_TAG}"

          echo "Waiting for rollout..."
          kubectl rollout status deploy/bmi-chart-deployment -n "${K8S_NAMESPACE}" --timeout=180s
        '''
      }
    }

    stage('Verify Pods') {
      when {
        expression {
          return !env.CHANGE_ID
        }
      }
      steps {
        sh '''
          echo "Pods in namespace:"
          kubectl get pods -n "${K8S_NAMESPACE}" -o wide

          echo "Services:"
          kubectl get svc -n "${K8S_NAMESPACE}"
        '''
      }
    }
  }

  post {
    success {
      echo "✅ Success: ${IMAGE_REPO}:${IMAGE_TAG} deployed to ${K8S_NAMESPACE}"
    }
    failure {
      echo "❌ Pipeline failed. Check the stage logs above."
    }
  }
}
