import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// Chave de assinatura fica FORA do projeto (C:\Users\Jezus\.secrets\marty-tv).
// Sem ela, o APK sai assinado com a chave de teste do Android.
val signingProps = Properties().apply {
    val f = file(System.getProperty("user.home") + "/.secrets/marty-tv/signing.properties")
    if (f.exists()) f.inputStream().use { load(it) }
}

android {
    namespace = "tv.martytv.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "tv.martytv.app"
        minSdk = 21
        targetSdk = 34
        versionCode = 30
        versionName = "3.0.0"
    }

    signingConfigs {
        if (signingProps.getProperty("storeFile") != null) {
            create("marty") {
                storeFile = file(signingProps.getProperty("storeFile"))
                storePassword = signingProps.getProperty("storePassword")
                keyAlias = signingProps.getProperty("keyAlias")
                keyPassword = signingProps.getProperty("keyPassword")
            }
        }
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = signingConfigs.findByName("marty") ?: signingConfigs.getByName("debug")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
}
