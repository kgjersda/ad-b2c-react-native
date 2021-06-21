import React, {
  PureComponent
} from "react";
import {
  WebView
} from "react-native-webview";
import adService from "./ADService";
import {
  RequestType
} from "./Constants";
import {
  BackHandler
} from "react-native";

export default class LoginView extends PureComponent {
  constructor(props) {
    super();
    this._setUri = this._setUri.bind(this);
    this.onNavigationStateChangeAsync = this.onNavigationStateChangeAsync.bind(
      this
    );
    this.onShouldStartLoadWithRequest = this.onShouldStartLoadWithRequest.bind(
      this
    );
    this._handleFlowResultAsync = this._handleFlowResultAsync.bind(this);
    this._backHandler = this._backHandler.bind(this);
    this.onWebViewError = this.onWebViewError.bind(this);

    this.webView = null;
    adService.init(props);
    this.state = {
      uri: adService.getLoginURI(),
      loaded: false,
    };
  }
  _backHandler() {
    this.webView.goBack();
    return true;
  }

  async componentDidMount() {
    BackHandler.addEventListener("hardwareBackPress", this._backHandler);
    const isAuthentic = await adService.isAuthenticAsync();
    if (isAuthentic) {
      this.props.onSuccess();
    } else {
      this.setState({
        loaded: true
      });
    }
  }

  componentWillUnmount() {
    BackHandler.removeEventListener("hardwareBackPress", this._backHandler);
  }

  async onNavigationStateChangeAsync(navState) {
    console.log("onNavigationStateChangeAsync", navState)
    const {
      url,
      loading
    } = navState;
    const {
      uri: stateUri
    } = this.state;

    //credits: Thanks to @stevef51 for the suggestion
    if (loading) {
      return false;
    }

    const result = adService.getLoginFlowResult(url);

    if (stateUri.toLocaleLowerCase().startsWith("https") // this might prevent exp
      && url.toLowerCase().startsWith("https")// this might prevent exp
      && url.toLowerCase() !== stateUri.toLowerCase()) {
      await this._handleFlowResultAsync(result, stateUri);
    }
  }

  onShouldStartLoadWithRequest(navState) {

    const loginFunction = async (currentUri) => {
      if (result.requestType === RequestType.Code && !navState.url.startsWith("https")) {
        console.log("code")

        const policy =
          currentUri.indexOf(adService.passwordResetPolicy) > -1 ?
            adService.passwordResetPolicy :
            adService.loginPolicy;

        console.log("code 1", "fetchAndSetTokenAsync")
        console.log("code 1", "fetchAndSetTokenAsync dar", result.data)
        console.log("code 1", "fetchAndSetTokenAsync", result)
        const reqResult = await adService.fetchAndSetTokenAsync(
          result.data,
          policy
        );
        console.log("code 2", "check result")
        if (reqResult.isValid) {
          console.log("code 3 success")
          this.props.onSuccess();
        } else {
          console.log("code 4 fail")
          this.props.onFail(reqResult.data);
        }
      }

    }


    console.log("onShouldStartLoadWithRequest", navState)
    const result = adService.getLoginFlowResult(navState.url);
    console.log("requestType", result.requestType)
    if (
      result.requestType === RequestType.Ignore ||
      result.requestType === RequestType.Code && !navState.loading ||
      result.requestType === RequestType.PasswordReset ||
      result.requestType === RequestType.Cancelled ||
      !navState.url.startsWith("https")
    ) {
      this.webView.stopLoading();
      loginFunction(navState.url);
      return false;
    }

    return true;
  }

  _setUri(uri) {
    console.log("_setUri", uri);
    this.setState({
      uri
    });
  }

  _isNewRequest = (currentUri, uri) => currentUri.toLowerCase() !== uri.toLowerCase();

  async _handleFlowResultAsync(result, currentUri) {
    if (result.requestType === RequestType.PasswordReset) {
      const thisUri = adService.getPasswordResetURI();
      if (this._isNewRequest(currentUri, thisUri)) {
        this._setUri(thisUri);
      }
    }

    if (result.requestType === RequestType.Cancelled) {
      const thisUri = adService.getLoginURI();
      if (this._isNewRequest(currentUri, thisUri)) {
        this._setUri(thisUri);
      } else {
        this._setUri(`${thisUri}&reloadedAt=${Date.now()}`);
      }
    }

    if (result.requestType === RequestType.Code) {
      console.log("code")

      const policy =
        currentUri.indexOf(adService.passwordResetPolicy) > -1 ?
          adService.passwordResetPolicy :
          adService.loginPolicy;

      console.log("code 1", "fetchAndSetTokenAsync")
      console.log("code 1", "fetchAndSetTokenAsync dar", result.data)
      console.log("code 1", "fetchAndSetTokenAsync", result)
      const reqResult = await adService.fetchAndSetTokenAsync(
        result.data,
        policy
      );
      console.log("code 2", "check result")
      if (reqResult.isValid) {
        console.log("code 3 success")
        this.props.onSuccess();
      } else {
        console.log("code 4 fail")
        this.props.onFail(reqResult.data);
      }
    }
  }

  onWebViewError({
    nativeEvent: e
  }) {
    console.log("onWebViewError", e)
    this.props.onFail(`Error accessing ${e.url}, ${e.description}`);
  }
  render() {
    const { uri, loaded } = this.state;
    const { renderLoading, onFail, ...rest } = this.props;
    console.log("URI", uri)
    if (!loaded) {
      return renderLoading();
    }
    
    return (<WebView userAgent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.2 Safari/605.1.15"
      incognito
      {...rest}
      originWhitelist={["*"]} // refer: https://github.com/facebook/react-native/issues/20917
      source={{ uri }}
      onNavigationStateChange={this.onNavigationStateChangeAsync}
      onShouldStartLoadWithRequest={this.onShouldStartLoadWithRequest}
      renderLoading={renderLoading}
      startInLoadingState
      onError={this.onWebViewError}
      ref={(c) => { this.webView = c; }}
    />
    );
  }
}