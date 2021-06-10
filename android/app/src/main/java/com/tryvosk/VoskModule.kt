package com.tryvosk

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Environment
import android.util.Log
import com.beust.klaxon.Klaxon
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule.RCTDeviceEventEmitter
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.atomic.AtomicBoolean
import org.vosk.Recognizer
import org.vosk.Model
//import org.kaldi.KaldiRecognizer
//import org.kaldi.Model

class KaldiVOSKModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    class KaldiPartialResult(val partial: String)
    class KaldiResultConf(val conf: Float, val end: Float, val start: Float, val word: String)
    class KaldiResult(val result: List<KaldiResultConf>, val text: String)
    class KaldiFinalResult(val text: String)

    private var model: Model? = null
    private var recognizer: Recognizer? = null

    private var isRecording: AtomicBoolean = AtomicBoolean(false)
    private var recorder: AudioRecord? = null
    private var transcriptionThread: Thread? = null

    private val RECORDER_CHANNELS: Int = AudioFormat.CHANNEL_IN_MONO
    private val RECORDER_AUDIO_ENCODING: Int = AudioFormat.ENCODING_PCM_16BIT
    private val SAMPLE_RATE_IN_HZ = 16000
    private val NUM_BUFFER_ELEMENTS = 4096
    private val BYTES_PER_ELEMENT = 2

    private val RECORDING_STEP_WIDTH: Long = 50L

    override fun getName(): String {
        return "Kaldi"
    }

    private fun createModel(): Boolean {

        val modelsDir = File("${Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)}/vosk/models/vosk-model-small-en-in-0.4")

        if (!modelsDir.exists()) {
            val event = Arguments.createMap()
            event.putString("message", "Model creation failed: ${modelsDir.absolutePath} does not exist.")
            sendEvent("onSpeechError", event)
            return false
        }

        model = Model(modelsDir.absolutePath)
        recognizer = Recognizer(model, 16000f)

        return true
    }

    private fun createRecorder() {
        recorder = AudioRecord(
                MediaRecorder.AudioSource.VOICE_RECOGNITION,
                SAMPLE_RATE_IN_HZ,
                RECORDER_CHANNELS,
                RECORDER_AUDIO_ENCODING,
                NUM_BUFFER_ELEMENTS * BYTES_PER_ELEMENT
        )
    }

    @ReactMethod
    fun initialize(promise: Promise) {
        if (!createModel()) {
            promise.reject("error", "Model creation failed.")
            return
        }

        createRecorder()
        sendEvent("onSpeechReady", Arguments.createMap())
        promise.resolve("success")
    }

    private fun transcribe() {
        val audioData = ShortArray(NUM_BUFFER_ELEMENTS)

        while (isRecording.get()) {
            recorder?.read(audioData, 0, NUM_BUFFER_ELEMENTS)

            val isFinal = recognizer?.acceptWaveForm(audioData, audioData.size)!!

            if (isFinal) {
                val jsonResult = recognizer?.result!!

                val result = Klaxon().parse<KaldiResult>(jsonResult)
                val text = result?.text ?: ""

                val event = Arguments.createMap()
                val value = Arguments.createArray()
                value.pushString(text)
                event.putArray("value", value)
                sendEvent("onSpeechResults", event)
            } else {
                val jsonPartialResult = recognizer?.partialResult!!
                val partialResult = Klaxon().parse<KaldiPartialResult>(jsonPartialResult)
                val text = partialResult?.partial ?: ""

                val event = Arguments.createMap()
                val value = Arguments.createArray()
                value.pushString(text)
                event.putArray("value", value)
        
                sendEvent("onSpeechPartialResults", event)
            }
        }

        recorder?.stop()

        sendEvent("onSpeechEnd", Arguments.createMap())

        val jsonFinalResult = recognizer?.finalResult!!
        val finalResult = Klaxon().parse<KaldiFinalResult>(jsonFinalResult)

        val event = Arguments.createMap()
        val value = Arguments.createArray()
        value.pushString(finalResult?.text ?: "")
        event.putArray("value", value)
        sendEvent("onSpeechFinalResults", event)

        
    }

    @ReactMethod
    fun startListening() {
        if (isRecording.compareAndSet(false, true)) {
            sendEvent("onSpeechStart", Arguments.createMap())
            recorder?.startRecording()

            if (transcriptionThread == null) {
                transcriptionThread = Thread({ transcribe() }, "Transcription Thread")
                transcriptionThread?.start()
            }
        }
    }

    @ReactMethod
    fun stopListening() {
        isRecording.set(false)

        Thread.sleep(RECORDING_STEP_WIDTH)

        // recording thread should be done by now

        transcriptionThread?.interrupt()
        transcriptionThread = null
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext.getJSModule(RCTDeviceEventEmitter::class.java).emit(eventName, params)
    }

    @ReactMethod
    fun destroy() {
        if (model != null) {
//            model?.delete()
            model = null
        }

        if (recognizer != null) {
//            recognizer?.delete()
            recognizer = null
        }

        if (recorder != null) {
            recorder?.release()
            recorder = null
        }

        isRecording.set(false)
        transcriptionThread = null
    }
}