import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { Formik } from 'formik';

import {
  InnerContainer,
  PageLogo,
  PageTitle,
  StyledContainer,
  SubTitle,
  StyledFormArea,
  StyledButton,
  StyledButtonText,
  StyledLabelInput,
  Colors,
  StyledInput,
  LeftIcon, // ✅ make sure this exists in your styles
} from '../components/styles';

import { Octicons } from '@expo/vector-icons';

const Login = () => {
  return (
    <StyledContainer>
      <StatusBar style="dark" />
      <InnerContainer>
        <PageLogo resizeMode="contain" source={require('../assets/img/logo.png')} />
        <PageTitle> Login Page </PageTitle>
        <SubTitle>Account Login</SubTitle>

        <Formik
          initialValues={{ email: '', password: '' }}
          onSubmit={(values) => {
            console.log(values);
          }}
        >
          {({ handleChange, handleBlur, handleSubmit, values }) => (
            <StyledFormArea>
              <FormInput
                label="Enter email or mobile number"
                icon="mail"
                onChangeText={handleChange('email')}
                onBlur={handleBlur('email')}
                value={values.email}
                keyboardType="email-address"
              />
              <FormInput
                label="Enter password"
                icon="lock"
                onChangeText={handleChange('password')}
                onBlur={handleBlur('password')}
                value={values.password}
                secureTextEntry={true}
              />
              <StyledButton onPress={handleSubmit}>
                <StyledButtonText>Login</StyledButtonText>
              </StyledButton>
            </StyledFormArea>
          )}
        </Formik>
      </InnerContainer>
    </StyledContainer>
  );
};

const FormInput = ({ label, icon, ...props }) => {
  return (
    <View>
      <LeftIcon>
        <Octicons name={icon} size={30} color={Colors.brand} />
      </LeftIcon>
      <StyledLabelInput>{label}</StyledLabelInput>
      <StyledInput {...props} />
    </View>
  );
};

export default Login;
