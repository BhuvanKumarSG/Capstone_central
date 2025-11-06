import os
import time
import shutil
import pandas as pd
import numpy as np
import tensorflow as tf
import gradio as gr
import xgboost as xgb
import matplotlib.pyplot as plt
from sklearn.preprocessing import MinMaxScaler
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.callbacks import ModelCheckpoint
from prophet import Prophet

# Define checkpoint paths
LSTM_CHECKPOINT = "best_lstm_model.h5"
PROPHET_CHECKPOINT = "best_prophet_model.pkl"
XGB_CHECKPOINT = "best_xgb_model.json"

# Load data
def load_data(file_path):
    df = pd.read_csv(file_path)
    df['Time'] = pd.to_datetime(df['Time'])
    df.set_index('Time', inplace=True)
    return df

# LSTM Model Setup
def create_new_lstm_model():
    """Creates and compiles a new LSTM model."""
    model = Sequential([
        LSTM(64, return_sequences=True, input_shape=(None, 10)),
        Dropout(0.2),
        LSTM(64),
        Dropout(0.2),
        Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def load_or_train_lstm():
    """Loads the LSTM model checkpoint if updated, otherwise trains a new model."""
    if os.path.exists(LSTM_CHECKPOINT):
        try:
            last_modified_time = os.path.getmtime(LSTM_CHECKPOINT)
            time.sleep(2)  # Wait for potential updates
            new_modified_time = os.path.getmtime(LSTM_CHECKPOINT)

            if last_modified_time == new_modified_time:
                print("LSTM checkpoint hasn't changed. Training from scratch.")
                return create_new_lstm_model()
            else:
                print("LSTM checkpoint updated. Loading saved model.")
                return load_model(LSTM_CHECKPOINT)
        except Exception as e:
            print(f"Error loading LSTM checkpoint: {e}. Training from scratch.")
            return create_new_lstm_model()
    else:
        print("LSTM checkpoint not found. Training from scratch.")
        return create_new_lstm_model()

# Prepare LSTM Data
def prepare_lstm_data(data, look_back=60):
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data['Close'].values.reshape(-1, 1))

    X, y = [], []
    for i in range(look_back, len(scaled_data)):
        X.append(scaled_data[i-look_back:i, 0])
        y.append(scaled_data[i, 0])

    X, y = np.array(X), np.array(y)
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]

    X_train = np.reshape(X_train, (X_train.shape[0], X_train.shape[1], 1))
    X_test = np.reshape(X_test, (X_test.shape[0], X_test.shape[1], 1))

    return X_train, y_train, X_test, y_test, scaler

# Train LSTM Model
def train_lstm(X_train, y_train, X_test, y_test):
    model = load_or_train_lstm()
    checkpoint = ModelCheckpoint(filepath=LSTM_CHECKPOINT, save_best_only=True, monitor='val_loss', mode='min')

    model.fit(X_train, y_train, epochs=10, batch_size=32, validation_data=(X_test, y_test), verbose=1, callbacks=[checkpoint])
    model.save(LSTM_CHECKPOINT)
    print("LSTM model training complete and saved successfully.")
    return model

# Prophet Model Setup
def train_prophet(data):
    prophet_df = data[['Close']].reset_index()
    prophet_df.columns = ['ds', 'y']

    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality=True)
    model.fit(prophet_df)

    model.save(PROPHET_CHECKPOINT)
    print("Prophet model trained and saved.")
    return model

def load_prophet_model():
    return Prophet.load(PROPHET_CHECKPOINT)

# XGBoost Model Setup
def train_xgboost(data, look_back=60):
    X, y = [], []
    for i in range(look_back, len(data)):
        X.append(data['Close'].values[i-look_back:i])
        y.append(data['Close'].values[i])

    X, y = np.array(X), np.array(y)
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]

    model = xgb.XGBRegressor(objective='reg:squarederror', n_estimators=100, learning_rate=0.1)
    model.fit(X_train, y_train)

    model.save_model(XGB_CHECKPOINT)
    print("XGBoost model trained and saved.")
    return model

def load_xgboost_model():
    model = xgb.XGBRegressor(objective='reg:squarederror')
    model.load_model(XGB_CHECKPOINT)
    return model

# Forex Prediction Function
def predict_forex(date, time):
    file_path = "EURUSD60_cleaned.csv"
    data = load_data(file_path)

    lstm_model = load_or_train_lstm()
    prophet_model = load_prophet_model()
    xgb_model = load_xgboost_model()

    input_datetime = pd.to_datetime(f"{date} {time}")

    # LSTM Prediction
    X_train_lstm, _, _, _, scaler = prepare_lstm_data(data)
    last_sequence = data['Close'].values[-60:]
    scaled_sequence = scaler.transform(last_sequence.reshape(-1, 1)).reshape((1, 60, 1))
    lstm_pred = scaler.inverse_transform(lstm_model.predict(scaled_sequence))[0][0]

    # Prophet Prediction
    future = prophet_model.make_future_dataframe(periods=1, freq='H')
    forecast = prophet_model.predict(future)
    prophet_pred = forecast['yhat'].iloc[-1]

    # XGBoost Prediction
    xgb_input = data['Close'].values[-60:].reshape(1, -1)
    xgb_pred = xgb_model.predict(xgb_input)[0]

    # Ensemble Prediction (50% LSTM, 30% Prophet, 20% XGBoost)
    final_prediction = 0.5 * lstm_pred + 0.3 * prophet_pred + 0.2 * xgb_pred

    return f"Predicted Closing Price: {final_prediction:.5f}"

# Gradio Interface
iface = gr.Interface(
    fn=predict_forex,
    inputs=[
        gr.Textbox(label="Date (YYYY-MM-DD)", placeholder="2025-05-09"),
        gr.Textbox(label="Time (HH:MM)", placeholder="12:00")
    ],
    outputs=gr.Textbox(label="Predicted Price"),
    title="EUR/USD Forex Prediction Dashboard",
    description="Enter a date and time to predict the EUR/USD closing price using an ensemble of LSTM, Prophet, and XGBoost models."
)

# Launch Dashboard
iface.launch()

# Enable Model Download
shutil.copy(LSTM_CHECKPOINT, "download/best_lstm_model.h5")
shutil.copy(PROPHET_CHECKPOINT, "download/best_prophet_model.pkl")
shutil.copy(XGB_CHECKPOINT, "download/best_xgb_model.json")
print("Models saved! You can now download them.")