node {
    stage("Cloning") {
        checkout scm
    }

    stage("Node Build & Test") {
        sh '''
        node -v
        npm -v
        npm ci
        npm test
        npm run lint
        '''
    }

    stage("Build & Push Image") {
        sh '''
        docker build -t aman932/node-bmi-metrics:01 .
        echo "aman932/node-bmi-metrics:01" > image.tag
        docker login -u $DOCKERHUB_USER -p $DOCKERHUB_PASS
        docker push aman932/node-bmi-metrics:01
        '''
    }

    stage("Helm Deploy to OpenShift") {
        sh '''
        helm upgrade --install bmi-chart helm/bmi-app --namespace aman-3101-dev --create-namespace
        '''
    }

    stage("Pods") {
        sh '''
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

    stage("Another job") {
        build job: "bmi-app deployment"
    }

    stage("Archive") {
        archiveArtifacts artifacts: 'image.tag', allowEmptyArchive: true
    }
}
