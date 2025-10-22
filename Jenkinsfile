pipeline {
  agent any

  environment {
    // --- Sonar ---
    SONAR_SERVER_NAME        = 'Sonar'
    SONAR_SCANNER_TOOL       = 'SonarScanner'

    // --- Docker Hub ---
    DOCKERHUB_CREDENTIALS_ID = 'dockerhub-creds'
    IMAGE_REPO               = 'docker.io/aman932/node-bmi-metrics'
    IMAGE_TAG                = "${BUILD_NUMBER}"

    // --- App / Chart / K8s ---
    APP_NAME      = 'node-bmi-metrics'
    K8S_NAMESPACE = 'aman-3101-dev'
    NPM_REGISTRY  = 'https://registry.npmjs.org/'

    // Helm chart (source lives inside this repo)
    CHART_NAME    = 'bmi-app'
    CHART_PATH    = 'helm/bmi-app'

    // Helm charts repo (GitHub Pages)
    GH_OWNER      = 'aman932'
    CHARTS_REPO   = 'helm-charts'
    CHARTS_URL    = 'https://aman932.github.io/helm-charts'

    // OpenShift API URL (set this to your cluster API)
    // Example: 'https://api.cluster.example.com:6443'
    OC_API        = '<<FILL_YOUR_OCP_API_URL>>'

    // Names used by deploy objects (adjust only if your chart names differ)
    RELEASE_NAME       = 'bmi'
    DEPLOYMENT_NAME    = 'bmi-app'        // Deployment name created by the chart
    SERVICE_NAME       = 'bmi-service'    // Service name created by the chart

    // --- Optional Monitoring ---
    // Set to 'true' to have Jenkins install kube-prometheus-stack & routes.
    INSTALL_MONITORING = 'false'
    MON_NS             = 'aman-monitoring'
    MON_RELEASE        = 'monitoring'     // used as Helm release; Prometheus label is "release: monitoring"
    GRAFANA_ADMIN_PASS = 'AmanStrong!123' // change in real usage
  }

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  stages {

    stage('Cloning') {
      steps { checkout scm }
    }

    stage('Preflight: Tooling & Context') {
      steps {
        sh '''
          set -e
          echo "Branch: $BRANCH_NAME ; CHANGE_ID: ${CHANGE_ID:-none}"
          node -v || true
          npm -v || true
          docker --version || true
          helm version || true
          kubectl version --client || true
          oc version --client || true
        '''
      }
    }

    stage('Node Build & Test') {
      steps {
        sh '''
          set -e
          echo "Setting npm registry..."
          npm config set registry "$NPM_REGISTRY"
          echo "Installing dependencies..."
          npm ci --no-audit --no-fund --prefer-offline
          echo "Running Jest tests..."
          npm test -- --runInBand --forceExit
        '''
      }
    }

    stage('SonarQube Analysis') {
      environment { SONAR_SCANNER_HOME = tool "${SONAR_SCANNER_TOOL}" }
      steps {
        withSonarQubeEnv("${SONAR_SERVER_NAME}") {
          sh '''
            set -e
            echo "Running SonarQube analysis..."
            "$SONAR_SCANNER_HOME/bin/sonar-scanner" \
              -Dsonar.projectKey=node-bmi-metrics \
              -Dsonar.projectName='Node BMI Metrics' \
              -Dsonar.sources=src \
              -Dsonar.tests=tests \
              -Dsonar.inclusions=src/**/*.js \
              -Dsonar.test.inclusions=tests/**/*.test.js \
              -Dsonar.host.url="$SONAR_HOST_URL"
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
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        withCredentials([usernamePassword(
            credentialsId: "${DOCKERHUB_CREDENTIALS_ID}",
            usernameVariable: 'DH_USER',
            passwordVariable: 'DH_PASS'
        )]) {
          sh '''
            set -e
            echo "Building Docker image..."
            docker build -t "${IMAGE_REPO}:${IMAGE_TAG}" -t "${IMAGE_REPO}:latest" .
            echo "Docker login..."
            echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
            echo "Pushing image tags..."
            docker push "${IMAGE_REPO}:${IMAGE_TAG}"
            docker push "${IMAGE_REPO}:latest"
            docker logout || true
          '''
        }
      }
    }

    stage('Package & Publish Helm Chart to GH Pages') {
      when {
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        withCredentials([string(credentialsId: 'gh-token', variable: 'GH_TOKEN')]) {
          sh '''
            set -e
            echo "Linting chart..."
            helm lint "${CHART_PATH}"
            echo "Packaging chart..."
            helm package "${CHART_PATH}"

            # Prepare temp workspace for gh-pages push
            rm -rf charts-tmp && mkdir charts-tmp
            cd charts-tmp
            git init
            git config user.email "ci@jenkins.local"
            git config user.name "Jenkins CI"
            git remote add origin https://$GH_TOKEN@github.com/${GH_OWNER}/${CHARTS_REPO}.git
            git fetch origin || true
            git checkout gh-pages || git checkout -b gh-pages

            echo "Moving packaged chart..."
            mv ../${CHART_NAME}-*.tgz .

            echo "Indexing Helm repo..."
            helm repo index . --url ${CHARTS_URL}

            git add .
            git commit -m "Add/Update ${CHART_NAME} for build ${IMAGE_TAG}" || echo "No changes to commit"
            git push origin gh-pages
          '''
        }
      }
    }

    stage('OpenShift Login & Project') {
      when {
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        withCredentials([string(credentialsId: 'ocp-token', variable: 'OC_TOKEN')]) {
          sh '''
            set -e
            if [ "${OC_API}" = "<<FILL_YOUR_OCP_API_URL>>" ]; then
              echo "ERROR: Please set OC_API to your OpenShift API URL in the Jenkinsfile env block."
              exit 1
            fi
            echo "Logging into OpenShift..."
            oc login --token="$OC_TOKEN" --server="$OC_API" --insecure-skip-tls-verify=true
            oc project "${K8S_NAMESPACE}" || oc new-project "${K8S_NAMESPACE}"
          '''
        }
      }
    }

    stage('Helm Deploy from GH Pages to OpenShift') {
      when {
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        sh '''
          set -e
          echo "Adding charts repo and updating..."
          helm repo add aman-charts ${CHARTS_URL} || true
          helm repo update

          echo "Deploying with Helm..."
          helm upgrade --install "${RELEASE_NAME}" aman-charts/${CHART_NAME} \
            --namespace "${K8S_NAMESPACE}" \
            --set image.repository="${IMAGE_REPO}" \
            --set image.tag="${IMAGE_TAG}"

          echo "Waiting for rollout..."
          kubectl rollout status deploy/${DEPLOYMENT_NAME} -n "${K8S_NAMESPACE}" --timeout=240s

          echo "Resources:"
          kubectl get pods -n "${K8S_NAMESPACE}" -o wide
          kubectl get svc  -n "${K8S_NAMESPACE}"
        '''
      }
    }

    stage('Create/Ensure OpenShift Route') {
      when {
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        sh '''
          set -e
          echo "Ensuring OpenShift Route for service ${SERVICE_NAME}..."
          if ! oc -n "${K8S_NAMESPACE}" get route "${RELEASE_NAME}" >/dev/null 2>&1; then
            oc -n "${K8S_NAMESPACE}" create route edge "${RELEASE_NAME}" --service="${SERVICE_NAME}"
          fi
          echo "App Route Host:"
          oc -n "${K8S_NAMESPACE}" get route "${RELEASE_NAME}" -o jsonpath='{.spec.host}'; echo
        '''
      }
    }

    // --------- Optional monitoring install (guarded by INSTALL_MONITORING flag) ----------
    stage('Install Prometheus + Grafana (optional)') {
      when {
        allOf {
          expression { return !env.CHANGE_ID }
          branch 'main'
          expression { return env.INSTALL_MONITORING?.toLowerCase() == 'true' }
        }
      }
      steps {
        sh '''
          set -e
          echo "Creating/Selecting monitoring namespace..."
          oc new-project "${MON_NS}" || true

          echo "Installing kube-prometheus-stack..."
          helm repo add prometheus-community https://prometheus-community.github.io/helm-charts || true
          helm repo update

          helm upgrade --install "${MON_RELEASE}" prometheus-community/kube-prometheus-stack \
            --namespace "${MON_NS}" \
            --set grafana.adminPassword="${GRAFANA_ADMIN_PASS}" \
            --set grafana.service.type=ClusterIP \
            --set prometheus.service.type=ClusterIP

          echo "Creating Routes for Grafana & Prometheus..."
          oc -n "${MON_NS}" get route grafana || oc -n "${MON_NS}" create route edge grafana --service "${MON_RELEASE}-grafana"
          oc -n "${MON_NS}" get route prometheus || oc -n "${MON_NS}" create route edge prometheus --service "${MON_RELEASE}-kube-prometheus-prometheus"

          echo "Grafana Route Host:"
          oc -n "${MON_NS}" get route grafana -o jsonpath='{.spec.host}'; echo
          echo "Prometheus Route Host:"
          oc -n "${MON_NS}" get route prometheus -o jsonpath='{.spec.host}'; echo
        '''
      }
    }

    stage('Apply ServiceMonitor for App Metrics') {
      when {
        allOf { expression { return !env.CHANGE_ID }; branch 'main' }
      }
      steps {
        sh '''
          set -e
          # NOTE: This assumes your Service has a port named "metrics" serving /metrics.
          # If your app exposes /metrics on the same http port, change 'port: metrics' to 'port: http'.
          cat > /tmp/bmi-servicemonitor.yaml <<'YAML'
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: bmi-servicemonitor
  namespace: ${MON_NS}
  labels:
    release: ${MON_RELEASE}
spec:
  selector:
    matchLabels:
      app: ${APP_NAME}
  namespaceSelector:
    matchNames:
      - ${K8S_NAMESPACE}
  endpoints:
    - port: metrics
      path: /metrics
      interval: 15s
YAML

          echo "Applying ServiceMonitor in ${MON_NS}..."
          oc apply -f /tmp/bmi-servicemonitor.yaml
        '''
      }
    }
  }

  post {
    success {
      script {
        if (!env.CHANGE_ID) {
          echo "✅ Success: ${IMAGE_REPO}:${IMAGE_TAG} built & deployed to ${K8S_NAMESPACE}"
        } else {
          echo "✅ Success (PR build): tests & Sonar passed. Image push/deploy skipped by design."
        }
      }
    }
    failure {
      echo "❌ Pipeline failed. Check the stage logs above."
    }
  }
}
