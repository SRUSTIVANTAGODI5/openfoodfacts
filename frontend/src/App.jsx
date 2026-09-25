import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import "./App.css";

const BACKEND_URL = "http://127.0.0.1:8000";
const CAMERA_ELEMENT_ID = "camera-reader";

function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [barcode, setBarcode] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState("");
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);

  const scannerRef = useRef(null);
  const scanningRef = useRef(false);
  const productRequestedRef = useRef(false);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scanningRef.current) {
          await scannerRef.current.stop();
        }

        await scannerRef.current.clear();
      } catch {
        // Camera may already be stopped.
      }

      scannerRef.current = null;
      scanningRef.current = false;
    }

    setCameraOpen(false);
  };

  const searchProduct = async (cleanBarcode) => {
    setLoading(true);
    setLoadingType("camera");
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/product/${cleanBarcode}`
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "The server could not find the product."
        );
      }

      if (data?.success && data?.product) {
        setResult(data);
        setBarcode(cleanBarcode);
      } else if (
        data?.barcode &&
        data?.message ===
          "Product not found in Open Food Facts."
      ) {
        setBarcode(data.barcode);

        setError(
          `Barcode ${data.barcode} was detected successfully, but this product is not currently available in the Open Food Facts database.`
        );
      } else {
        setError(
          data?.message ||
            "Product not found in Open Food Facts."
        );
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure FastAPI is running."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while searching for the product."
        );
      }
    } finally {
      setLoading(false);
      setLoadingType("");
    }
  };

  const startCamera = async () => {
    if (cameraOpen || loading) {
      return;
    }

    setError("");
    setResult(null);
    productRequestedRef.current = false;

    try {
      const scanner = new Html5Qrcode(
        CAMERA_ELEMENT_ID
      );

      scannerRef.current = scanner;

      setCameraOpen(true);

      await new Promise((resolve) => {
        setTimeout(resolve, 100);
      });

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 280,
            height: 150,
          },
          aspectRatio: 1.777778,
        },
        async (decodedText) => {
          if (productRequestedRef.current) {
            return;
          }

          const cleanBarcode =
            decodedText.trim();

          if (!/^\d+$/.test(cleanBarcode)) {
            return;
          }

          if (
            cleanBarcode.length < 8 ||
            cleanBarcode.length > 14
          ) {
            return;
          }

          productRequestedRef.current = true;

          setBarcode(cleanBarcode);

          await stopCamera();

          await searchProduct(cleanBarcode);
        },
        () => {
          // Ignore normal scanning failures.
        }
      );

      scanningRef.current = true;
    } catch (err) {
      console.error(
        "Camera error:",
        err
      );

      await stopCamera();

      setError(
        "Unable to access the camera. Please allow camera permission and try again."
      );
    }
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    setSelectedFile(file);

    setPreview(
      URL.createObjectURL(file)
    );

    setResult(null);
    setError("");
  };

  const handleScan = async () => {
    if (loading) {
      return;
    }

    if (!selectedFile) {
      setError(
        "Please select a product image first."
      );
      return;
    }

    setLoading(true);
    setLoadingType("scan");
    setError("");
    setResult(null);

    const formData = new FormData();

    formData.append(
      "file",
      selectedFile
    );

    try {
      const response = await fetch(
        `${BACKEND_URL}/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "The server could not process the image."
        );
      }

      if (
        data?.success &&
        data?.product
      ) {
        setResult(data);

        setBarcode(
          data.barcode || ""
        );
      } else if (
        data?.barcode &&
        data?.message ===
          "Product not found in Open Food Facts."
      ) {
        setBarcode(data.barcode);

        setError(
          `Barcode ${data.barcode} was detected successfully, but this product is not currently available in the Open Food Facts database.`
        );
      } else {
        setError(
          data?.message ||
            "We could not find a product for the detected barcode."
        );
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure FastAPI is running."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while scanning the product."
        );
      }
    } finally {
      setLoading(false);
      setLoadingType("");
    }
  };

  const handleBarcodeSearch = async () => {
    if (loading) {
      return;
    }

    const cleanBarcode =
      barcode.trim();

    if (!cleanBarcode) {
      setError(
        "Please enter a barcode."
      );
      setResult(null);
      return;
    }

    if (!/^\d+$/.test(cleanBarcode)) {
      setError(
        "Barcode must contain numbers only."
      );
      setResult(null);
      return;
    }

    if (
      cleanBarcode.length < 8 ||
      cleanBarcode.length > 14
    ) {
      setError(
        "Please enter a valid barcode with 8 to 14 digits."
      );
      setResult(null);
      return;
    }

    setLoading(true);
    setLoadingType("search");
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        `${BACKEND_URL}/product/${cleanBarcode}`
      );

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The server returned an invalid response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            data?.message ||
            "The server could not find the product."
        );
      }

      if (
        data?.success &&
        data?.product
      ) {
        setResult(data);
      } else if (
        data?.barcode &&
        data?.message ===
          "Product not found in Open Food Facts."
      ) {
        setError(
          `Barcode ${data.barcode} was found, but this product is not currently available in the Open Food Facts database.`
        );
      } else {
        setError(
          data?.message ||
            "Product not found in Open Food Facts."
        );
      }
    } catch (err) {
      if (err instanceof TypeError) {
        setError(
          "Cannot connect to the backend. Please make sure FastAPI is running."
        );
      } else {
        setError(
          err.message ||
            "Something went wrong while searching for the product."
        );
      }
    } finally {
      setLoading(false);
      setLoadingType("");
    }
  };

  const handleBarcodeKeyDown = (
    event
  ) => {
    if (event.key === "Enter") {
      handleBarcodeSearch();
    }
  };

  const handleScanAnother = () => {
    setResult(null);
    setBarcode("");
    setError("");
    setSelectedFile(null);
    setPreview("");

    productRequestedRef.current = false;
  };

  const getValue = (
    value,
    unit = ""
  ) => {
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      value === "N/A"
    ) {
      return "N/A";
    }

    return `${value}${unit}`;
  };

  return (
    <div className="app">

      <header className="header">
        <div>
          <h1>
            🥗 OpenFood Scanner
          </h1>

          <p>
            Scan a product barcode and
            get food information instantly.
          </p>
        </div>
      </header>

      <main className="container">

        <section className="scanner-card">

          <h2>
            Scan Your Product
          </h2>

          <p className="description">
            Scan using your camera or
            upload a clear barcode image.
          </p>

          {!cameraOpen && (
            <button
              className="camera-button"
              onClick={startCamera}
              disabled={loading}
            >
              📷 Scan with Camera
            </button>
          )}

          {cameraOpen && (
            <div className="camera-section">

              <div
                id={CAMERA_ELEMENT_ID}
                className="camera-reader"
              ></div>

              <p className="camera-message">
                📷 Point your camera at the
                product barcode
              </p>

              <div className="camera-loader">
                <span className="spinner"></span>
                Looking for barcode...
              </div>

            </div>
          )}

          {!cameraOpen && (
            <>

              <div className="camera-divider">
                <span>OR</span>
              </div>

              <label className="upload-box">

                {preview ? (
                  <img
                    src={preview}
                    alt="Selected product"
                    className="preview-image"
                  />
                ) : (
                  <>
                    <div className="upload-icon">
                      📷
                    </div>

                    <strong>
                      Choose Product Photo
                    </strong>

                    <span>
                      JPG, JPEG or PNG
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  disabled={loading}
                />

              </label>

              {selectedFile && (
                <p className="file-name">
                  Selected:{" "}
                  {selectedFile.name}
                </p>
              )}

              <button
                className="scan-button"
                onClick={handleScan}
                disabled={loading}
              >

                {loading &&
                loadingType === "scan" ? (
                  <span className="button-loading">
                    <span className="spinner"></span>
                    Scanning...
                  </span>
                ) : (
                  "🔍 Scan Barcode"
                )}

              </button>

              <div className="manual-search">

                <div className="divider">
                  <span>OR</span>
                </div>

                <h3>
                  Enter Barcode Manually
                </h3>

                <div className="barcode-row">

                  <input
                    type="text"
                    value={barcode}
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      if (
                        /^\d*$/.test(value)
                      ) {
                        setBarcode(value);
                        setError("");
                      }
                    }}
                    onKeyDown={
                      handleBarcodeKeyDown
                    }
                    placeholder="Enter barcode number"
                    inputMode="numeric"
                    maxLength={14}
                    disabled={loading}
                  />

                  <button
                    className="search-button"
                    onClick={
                      handleBarcodeSearch
                    }
                    disabled={loading}
                  >

                    {loading &&
                    loadingType ===
                      "search" ? (
                      <span className="button-loading">
                        <span className="spinner"></span>
                        Searching...
                      </span>
                    ) : (
                      "Search"
                    )}

                  </button>

                </div>

                <p className="barcode-hint">
                  Enter an 8 to 14 digit
                  barcode.
                </p>

              </div>

            </>
          )}

          {error && (
            <div className="error-box">
              ⚠️ {error}
            </div>
          )}

        </section>

        {result &&
          result.product && (
            <section className="result-section">

              <h2>
                Product Information
              </h2>

              <button
                className="scan-another-button"
                onClick={handleScanAnother}
              >
                🔄 Scan Another Product
              </button>

              <div className="product-card">

                <div className="product-top">

                  {result.product.image ? (
                    <img
                      src={
                        result.product.image
                      }
                      alt={
                        result.product.name ||
                        "Product"
                      }
                      className="product-image"
                    />
                  ) : (
                    <div className="no-image">
                      No Image
                    </div>
                  )}

                  <div className="product-title">

                    <h3>
                      {result.product.name ||
                        "Unknown Product"}
                    </h3>

                    <p>
                      <strong>
                        Brand:
                      </strong>{" "}
                      {result.product.brand ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Quantity:
                      </strong>{" "}
                      {result.product.quantity ||
                        "N/A"}
                    </p>

                    <p>
                      <strong>
                        Barcode:
                      </strong>{" "}
                      {result.barcode ||
                        barcode}
                    </p>

                  </div>

                </div>

                <div className="info-grid">

                  <div className="info-box">
                    <h4>
                      🥕 Ingredients
                    </h4>

                    <p>
                      {result.product
                        .ingredients ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>
                      ⚠️ Allergens
                    </h4>

                    <p>
                      {result.product
                        .allergens ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>
                      📂 Categories
                    </h4>

                    <p>
                      {result.product
                        .categories ||
                        "Not available"}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>
                      ⭐ Nutri-Score
                    </h4>

                    <p className="score">
                      {result.product
                        .nutriscore ||
                        "N/A"}
                    </p>
                  </div>

                  <div className="info-box">
                    <h4>
                      🔬 NOVA Group
                    </h4>

                    <p>
                      {result.product
                        .nova_group ||
                        "N/A"}
                    </p>
                  </div>

                </div>

                <div className="nutrition-section">

                  <h3>
                    Nutrition per 100g
                  </h3>

                  <div className="nutrition-grid">

                    <div>
                      <span>
                        Energy
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.energy_kcal,
                          " kcal"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Fat
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition?.fat,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Saturated Fat
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.saturated_fat,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Carbohydrates
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.carbohydrates,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Sugars
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.sugars,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Fiber
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition?.fiber,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Protein
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.proteins,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Salt
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition?.salt,
                          " g"
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Sodium
                      </span>

                      <strong>
                        {getValue(
                          result.product
                            .nutrition
                            ?.sodium,
                          " g"
                        )}
                      </strong>
                    </div>

                  </div>

                </div>

              </div>

            </section>
          )}

      </main>

      <footer>
        <p>
          OpenFood Scanner • Powered by
          Open Food Facts
        </p>
      </footer>

    </div>
  );
}

export default App;