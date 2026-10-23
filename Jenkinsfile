// Pipeline Jenkins: checkout -> install -> test -> build -> docker -> smoke test -> (opsional) deploy.
// Pipeline GAGAL otomatis bila salah satu perintah sh mengembalikan kode non-nol (test/build gagal).
// Prasyarat Jenkins: plugin NodeJS (tool bernama 'node22'), Pipeline, Credentials Binding, SSH Agent (opsional);
// agent memiliki Docker CLI. Lihat docs/JENKINS.md.
pipeline {
  agent any

  tools { nodejs 'node22' }

  parameters {
    booleanParam(name: 'DEPLOY', defaultValue: false, description: 'Deploy ke server via SSH setelah semua tahap lulus')
  }

  options {
    timestamps()
    timeout(time: 30, unit: 'MINUTES')
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '10'))
  }

  environment {
    APP_NAME   = 'rental-motor-samosir'
    IMAGE_TAG  = "rental-motor-samosir:${env.BUILD_NUMBER}"
    SMOKE_PORT = '4099'
    CI         = 'true'
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Install dependency') {
      parallel {
        stage('Backend')  { steps { dir('backend')  { sh 'npm ci' } } }
        stage('Frontend') { steps { dir('frontend') { sh 'npm ci' } } }
      }
    }

    stage('Test') {
      parallel {
        stage('Backend (Jest)')   { steps { dir('backend')  { sh 'npm run test:coverage' } } }
        stage('Frontend (Vitest)') { steps { dir('frontend') { sh 'npm test' } } }
      }
    }

    stage('Build frontend') {
      steps { dir('frontend') { sh 'npm run build' } }
    }

    stage('Build image Docker') {
      steps { sh 'docker build -t "$IMAGE_TAG" -t "$APP_NAME:latest" .' }
    }

    stage('Smoke test container') {
      steps {
        sh '''
          docker rm -f "$APP_NAME-smoke" >/dev/null 2>&1 || true
          docker run -d --name "$APP_NAME-smoke" -p "$SMOKE_PORT:4000" "$IMAGE_TAG"
          for i in $(seq 1 30); do
            curl -fs "http://localhost:$SMOKE_PORT/api/health" >/dev/null && break
            sleep 2
          done
          node scripts/smoke.mjs "http://localhost:$SMOKE_PORT" | tee smoke-result.txt
        '''
      }
      post {
        always { sh 'docker logs "$APP_NAME-smoke" > container.log 2>&1 || true; docker rm -f "$APP_NAME-smoke" || true' }
      }
    }

    stage('Deploy (SSH)') {
      when { expression { params.DEPLOY } }
      steps {
        // Kredensial dibuat di Jenkins (Manage Credentials); TIDAK disimpan di repository.
        withCredentials([
          sshUserPrivateKey(credentialsId: 'deploy-ssh-key', keyFileVariable: 'SSH_KEY', usernameVariable: 'SSH_USER'),
          string(credentialsId: 'deploy-host', variable: 'DEPLOY_HOST')
        ]) {
          sh '''
            SSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new $SSH_USER@$DEPLOY_HOST"
            docker save "$IMAGE_TAG" | gzip | $SSH "gunzip | docker load"
            $SSH "docker rm -f $APP_NAME || true"
            $SSH "docker run -d --name $APP_NAME --restart unless-stopped -p 80:4000 -v rental_data:/data $IMAGE_TAG"
            for i in $(seq 1 20); do curl -fs "http://$DEPLOY_HOST/api/health" && break; sleep 3; done
          '''
        }
      }
    }
  }

  post {
    always {
      archiveArtifacts artifacts: 'smoke-result.txt, container.log, backend/coverage/lcov.info', allowEmptyArchive: true
    }
    success { echo 'Pipeline LULUS: semua test, build, dan smoke test berhasil.' }
    failure { echo 'Pipeline GAGAL: periksa Console Output pada tahap yang berwarna merah.' }
  }
}
