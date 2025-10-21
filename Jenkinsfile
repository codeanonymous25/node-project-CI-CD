// Jenkinsfile
pipeline {
  agent any
  environment {
    APP_NAME = 'bmi-app'
    IMAGE_REPO = 'aman932'                    // Docker Hub username
    IMAGE_NAME = "${IMAGE_REPO}/node-bmi-metrics"
    VERSION = '01'                            // fixed tag as requested
    CHART_DIR = 'helm/bmi-app'
    NAMESPACE = 'aman-3101-dev'
    SONARQUBE_SERVER = ''                     // set to 'SonarQube' if you use it
  }
  stages {
    stage('Checkout') {
      steps {
        checkout scm
        script { currentBuild.displayName = "#${env.BUILD_NUMBER} ${env.BRANCH_NAME}" }
      }
    }
    stage('Node Build & Test') {
      steps {
        sh 'node -v && npm -v'
        sh 'npm ci'
        sh 'npm test'
        sh 'npm run lint'
      }
    }
    stage('Build & Push Image') {
      steps {
        script {
          def tag = "${IMAGE_NAME}:${VERSION}"
          docker.withRegistry('https://index.docker.io/v1/', 'dockerhub-creds') {
            def app = docker.build(tag)
            app.push()
          }
          writeFile file: 'image.tag', text: tag
        }
      }
    }
    stage('Helm Deploy to OpenShift') {
      steps {
        script {
          sh "helm upgrade --install bmi-chart ${CHART_DIR} --namespace ${NAMESPACE} --create-namespace"
        }
      }
    }
  }
  post {
    always { archiveArtifacts artifacts: 'image.tag', allowEmptyArchive: true }
  }
}
