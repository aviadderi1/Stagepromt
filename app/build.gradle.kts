plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.aviad.bama"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.aviad.bama"
        minSdk = 26
        targetSdk = 34
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0." + maxOf(0, (System.getenv("GITHUB_RUN_NUMBER") ?: "134").toInt() - 134)
    }

    flavorDimensions += "device"
    productFlavors {
        create("tablet") {
            dimension = "device"
            manifestPlaceholders["appLabel"] = "StagePromt"
            manifestPlaceholders["authScheme"] = "stagepromt"
        }
        create("phone") {
            dimension = "device"
            applicationIdSuffix = ".mobile"
            manifestPlaceholders["appLabel"] = "StagePromt Mobile"
            manifestPlaceholders["authScheme"] = "stagepromtm"
        }
    }

    signingConfigs {
        create("release") {
            storeFile = file("bama-release.keystore")
            storeType = "pkcs12"
            storePassword = "bama2026"
            keyAlias = "bama"
            keyPassword = "bama2026"
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("release")
        }
    }

    lint {
        checkReleaseBuilds = false
        abortOnError = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.work:work-runtime-ktx:2.9.1")
    implementation("com.google.android.gms:play-services-code-scanner:16.1.0")
}
