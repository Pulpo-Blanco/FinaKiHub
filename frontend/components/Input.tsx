// components/Input.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

type Props = TextInputProps & {
  label?: string;
  error?: string;
  password?: boolean;
  /** Estilo del contenedor (View) */
  containerStyle?: StyleProp<ViewStyle>;
  /** Estilo del input (TextInput) */
  inputStyle?: StyleProp<TextStyle>;
};

export default function Input({
  label,
  error,
  password,
  containerStyle,
  inputStyle,
  ...rest
}: Props) {
  const [hide, setHide] = useState(password);

  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={[styles.field, !!error && styles.fieldError, containerStyle]}>
        <TextInput
          placeholderTextColor={Colors.textLight}
          secureTextEntry={!!hide}
          style={[styles.input, inputStyle]}
          {...rest}
        />
        {password && (
          <TouchableOpacity onPress={() => setHide((v) => !v)}>
            <Ionicons name={hide ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, color: Colors.textLight, marginBottom: 6 },
  field: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    // ¡nada de "cursor" aquí! React Native no usa esa propiedad.
  },
  fieldError: { borderColor: Colors.error },
  input: { flex: 1, color: Colors.text, fontSize: FontSize.md },
  error: { marginTop: 6, color: Colors.error, fontSize: FontSize.sm },
});
