import { Bluetooth, Heart, Loader2 } from "lucide-react";
import { useState } from "react";

interface BluetoothConnectProps {
  onConnected: (device: any, heartRate: number, onHeartRateUpdate: (bpm: number) => void) => void;
  onHeartRateChange?: (bpm: number) => void;
  onBack: () => void;
}

export function BluetoothConnect({ onConnected, onHeartRateChange, onBack }: BluetoothConnectProps) {
  const [status, setStatus] = useState<"idle" | "scanning" | "connecting" | "connected" | "error">("idle");
  const [error, setError] = useState("");
  const [heartRate, setHeartRate] = useState(0);

  const handleHeartRateUpdate = (bpm: number) => {
    setHeartRate(bpm);
  };

  const connectToDevice = async () => {
    setStatus("scanning");
    setError("");

    try {
      console.log("Attempting Bluetooth connection, navigator.bluetooth:", (navigator as any).bluetooth);
      
      let device: any = undefined;
      const bt = (navigator as any).bluetooth;

      if (typeof bt?.getDevices === "function") {
        const devices = await bt.getDevices();
        console.log("Found previously paired devices:", devices);
        device = devices.find((d: any) => d.gatt && d.name);
      }

      if (!device) {
        console.log("Requesting new device...");
        device = await bt.requestDevice({
          filters: [{ services: ["heart_rate"] }],
          optionalServices: ["battery_service", "device_information"],
        });
        console.log("Device selected:", device.name);
      }

      if (!device) {
        setStatus("idle");
        setError("No device selected");
        return;
      }

      setStatus("connecting");
      console.log("Connecting to GATT server...");

      const server = await device.gatt.connect();
      console.log("Getting heart rate service...");
      
      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");

      console.log("Starting notifications...");
      await characteristic.startNotifications();

      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value;
        const flags = value.getUint8(0);
        let bpm: number;
        if (flags & 0x1) {
          bpm = value.getUint16(1);
        } else {
          bpm = value.getUint8(1);
        }
        console.log("Heart rate received:", bpm);
        handleHeartRateUpdate(bpm);
        if (onHeartRateChange) {
          onHeartRateChange(bpm);
        }
      });

      localStorage.setItem("cheetahfit_heartrate_device", device.id);

      setStatus("connected");
      console.log("Connected successfully!");
      
      setTimeout(() => {
        onConnected(device, heartRate || 72, handleHeartRateUpdate);
      }, 500);
    } catch (err: any) {
      console.error("Bluetooth error:", err);
      const errorMessage = err.name === "NotFoundError" 
        ? "No heart rate monitor found. Make sure device is nearby and powered on."
        : err.name === "SecurityError"
          ? "Bluetooth permission denied. Check browser settings."
          : err.message || "Connection failed: " + err.name;
      setError(errorMessage);
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-4 p-4 border-b border-border">
        <button
          onClick={onBack}
          className="p-2 hover:bg-secondary rounded-lg transition-colors"
        >
          <Heart className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground tracking-wide">
          CONNECT HEART RATE MONITOR
        </h1>
      </header>

      <main className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        <div className="w-32 h-32 rounded-full bg-card flex items-center justify-center">
          {status === "scanning" || status === "connecting" ? (
            <Loader2 className="h-16 w-16 text-primary animate-spin" />
          ) : status === "connected" ? (
            <Heart className="h-16 w-16 text-red-500 fill-red-500 animate-pulse" />
          ) : (
            <Bluetooth className="h-16 w-16 text-muted-foreground" />
          )}
        </div>

        <div className="text-center space-y-2">
          {status === "idle" && (
            <p className="text-muted-foreground">Tap button to scan for devices</p>
          )}
          {status === "scanning" && (
            <p className="text-primary">Scanning for heart rate monitors...</p>
          )}
          {status === "connecting" && (
            <p className="text-primary">Connecting to device...</p>
          )}
          {status === "connected" && heartRate > 0 && (
            <div className="space-y-1">
              <p className="text-green-500 font-semibold">Connected!</p>
              <p className="text-4xl font-bold text-foreground">{heartRate}</p>
              <p className="text-muted-foreground text-sm">BPM</p>
            </div>
          )}
          {status === "error" && (
            <p className="text-destructive">{error}</p>
          )}
        </div>

        {status !== "connected" && (
          <button
            onClick={connectToDevice}
            disabled={status === "scanning" || status === "connecting"}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground font-semibold py-3 px-8 rounded-xl transition-colors"
          >
            {status === "scanning" || status === "connecting" ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                SEARCHING...
              </>
            ) : (
              <>
                <Bluetooth className="h-5 w-5" />
                SCAN FOR DEVICE
              </>
            )}
          </button>
        )}
      </main>
    </div>
  );
}