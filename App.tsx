/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * Generated with the TypeScript template
 * https://github.com/react-native-community/react-native-template-typescript
 *
 * @format
 */

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  NativeModules,
  Button,
  NativeEventEmitter,
  PermissionsAndroid,
} from 'react-native';

import {wordErrorRate, calculateEditDistance} from 'word-error-rate';

import VoskInterface from './VoskModule';

const requestMicrophonePermission = async (setLogs: Function) => {
  const SUCCESS_MSG = 'Permission RECORD_AUDIO granted.';
  const DENIED_MSG = 'Permission RECORD_AUDIO denied.';
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      setLogs(SUCCESS_MSG);
    } else {
      setLogs(DENIED_MSG);
    }
  } catch (err) {
    // console.error(err);
    setLogs(err);
  }
};

const requestReadExternalPermission = async (setLogs: Function) => {
  const SUCCESS_MSG = 'Permission READ_EXTERNAL_STORAGE granted.';
  const DENIED_MSG = 'Permission READ_EXTERNAL_STORAGE denied.';

  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );

    if (granted === PermissionsAndroid.RESULTS.GRANTED) {
      setLogs(SUCCESS_MSG);
    } else {
      setLogs(DENIED_MSG);
    }
  } catch (err) {
    // console.error(err);
    setLogs(err);
  }
};

const App = () => {
  const separatorText = '-----------------------------------------------------';
  const phrases = [
    'zoom out',
    'zoom in',
    'exposure level minus one',
    'continue',
    'rename selected tasks',
    'start',
    'previous page',
    'start camera',
    'page down',
    'rotate image',
    'magnify off',
    'manage license',
    'unfreeze page',
    'scroll to cursor',
    'stop recording',
    'zoom level five',
    'document control',
    'edit workflow',
    'decrease width',
    'show selected tage views',
    'move down',
  ];
  const [logs, _setLogs] = useState('');
  const [phraseIdx, setPhraseIdx] = useState(-1);
  const scrollViewRef = useRef<ScrollView>();
  const logsRef = useRef(logs);
  const preds = useRef<string[]>([]);

  const increment = () => {
    setPhraseIdx(phraseIdx + 1);
  };

  const getLogTime = () => new Date().toLocaleTimeString();

  const setLogs = (data: string, addNewLine = true) => {
    if (addNewLine) {
      logsRef.current = `${logsRef.current}\n${getLogTime()}: ${data}`;
    } else {
      logsRef.current = `${logsRef.current}${data}`;
    }

    _setLogs(`${logsRef.current}`);
  };

  const calculateWER = () => {
    if (preds.current.length !== phrases.length) {
      const mismatchLenErrTxt = `Mismatch in predicted phrases (${preds.current.length}) and true phrases (${phrases.length})\nPlease Restart App.`;

      setLogs(mismatchLenErrTxt);

      console.error(mismatchLenErrTxt);
    }
    let wer = 0;
    for (let idx = 0; idx < phrases.length; idx++) {
      // EditDistance is between words and not character
      wer += calculateEditDistance(preds.current[idx][0], phrases[idx]);
    }

    wer /= phrases.length;

    setLogs(`${separatorText}WER: ${wer}`);
  };

  const changePhrase = () => {
    setPhraseIdx(phraseIdx + 1);
    if (phraseIdx + 1 >= phrases.length) {
      setLogs('Done transcribing all phrases');
      setLogs(preds.current.join('\n'));
      setLogs('Calculating WER...');
      calculateWER();
      return;
    }
    const nextPhrase = phrases[phraseIdx + 1];
    setLogs(`Speak: ${nextPhrase}`);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await requestReadExternalPermission(setLogs);
        await requestMicrophonePermission(setLogs);

        await VoskInterface.initialize();
        changePhrase();
        increment();
      } catch (error) {
        console.error(error);
        // setLogs(error);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native Event handlers
  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VoskModule);

    eventEmitter.addListener('onSpeechReady', event => {
      setLogs('Ready to Record.');
    });

    eventEmitter.addListener('onSpeechError', event => {
      // error message is in 'message' key
      setLogs(event.message);
    });

    eventEmitter.addListener('onSpeechFinalResults', event => {
      setLogs(`${event.value}\n${separatorText}`);
      preds.current = [...preds.current, event.value];
    });

    //  eventEmitter.addListener("onSpeechPartialResults", (event) => {
    //   console.log("onSpeechPartialResults");
    //   console.log(event);
    //  })

    eventEmitter.addListener('onSpeechEnd', event => {
      // console.log('onSpeechEnd');
      // console.log(event);
      // setLogs("Recording ended.")
    });

    eventEmitter.addListener('onSpeechStart', event => {
      // console.log('onSpeechStart');
      // console.log(event);
      setLogs('Recording...');
    });

    eventEmitter.addListener('onSpeechStop', event => {
      // console.log('onSpeechStart');
      // console.log(event);
      setLogs('.stopped', false);
    });

    // eventEmitter.addListener("TranscribeFile", event => {
    //   console.log(JSON.stringify(event))
    // })
  }, []);

  

  return (
    <SafeAreaView>
      <StatusBar />
      <View style={styles.container}>
        <View style={[styles.sectionContainer, {borderWidth: 1, flex: 3}]}>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            ref={scrollViewRef}
            onContentSizeChange={(contentWidth, contentHeight) => {
              scrollViewRef.current?.scrollToEnd({animated: true});
            }}>
            <Text>{logs}</Text>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.btnContainer}>
            <Button
              title="Start Recording"
              color="#841584"
              onPress={() => VoskInterface.startListening()}
            />
          </View>
          <View style={styles.btnContainer}>
            <Button
              title="Stop Recording"
              color="#451584"
              onPress={() => VoskInterface.stopListening()}
            />
          </View>

          <View style={styles.btnContainer}>
            <Button
              title="Next Phrase"
              color="#451584"
              onPress={() => changePhrase()}
              disabled={phraseIdx >= phrases.length}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    display: 'flex',
    padding: 20,
    height: '100%',
    flexDirection: 'column',
  },
  sectionContainer: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: 10,
    padding: 5,
  },
  btnContainer: {
    display: 'flex',
    flexDirection: 'column',
    // backgroundColor: 'aqua',
    alignSelf: 'stretch',
    justifyContent: 'space-around',
    margin: 5,
  },
});

export default App;
