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

import {Colors} from 'react-native/Libraries/NewAppScreen';

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
  const [logs, _setLogs] = useState('');

  const logsRef = useRef(logs);

  const getLogTime = () => new Date().toLocaleTimeString();

  const setLogs = (data: string) => {
    logsRef.current = `${logsRef.current}\n${getLogTime()}: ${data}`;
    _setLogs(`${logsRef.current}`);
  };
  
  const init = async () => {
    try {
      await requestReadExternalPermission(setLogs);
      await requestMicrophonePermission(setLogs);

      await VoskInterface.initialize();
    } catch (error) {
      console.error(error);
      // setLogs(error);
    }
  };

  useEffect(() => {
    init();
  }, []);

  useEffect(() => {
    const eventEmitter = new NativeEventEmitter(NativeModules.VoskModule);

    eventEmitter.addListener('onSpeechReady', event => {
      setLogs('Ready to Record.');
    });

    eventEmitter.addListener('onSpeechError', event => {
      // error message is in 'message' key
      setLogs(event['message']);
    });

    eventEmitter.addListener('onSpeechFinalResults', event => {
      setLogs(event['value']);
    });

    //  eventEmitter.addListener("onSpeechPartialResults", (event) => {
    //   console.log("onSpeechPartialResults");
    //   console.log(event);
    //  })

    eventEmitter.addListener('onSpeechEnd', event => {
      // console.log('onSpeechEnd');
      // console.log(event);
      setLogs("Recording ended.")
    });

    eventEmitter.addListener('onSpeechStart', event => {
      // console.log('onSpeechStart');
      // console.log(event);
      setLogs("Recording started.")
    });
  }, []);

  const isDarkMode = useColorScheme() === 'dark';

  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.container}>
        <View style={[styles.sectionContainer, {borderWidth: 1, flex: 3}]}>
          <ScrollView contentInsetAdjustmentBehavior="automatic">
            <Text>{logs}</Text>
          </ScrollView>
        </View>

        <View style={styles.sectionContainer}>
          {/* <View style={styles.btnContainer}>
            <Button
              title="Request Permissions"
              color="#841584"
              onPress={requestPermissions}
            />
          </View> */}
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
  // sectionContainer: {
  //   marginTop: 32,
  //   paddingHorizontal: 24,
  // },
  // sectionTitle: {
  //   fontSize: 24,
  //   fontWeight: '600',
  // },
  // sectionDescription: {
  //   marginTop: 8,
  //   fontSize: 18,
  //   fontWeight: '400',
  // },
  // highlight: {
  //   fontWeight: '700',
  // },
});

export default App;
