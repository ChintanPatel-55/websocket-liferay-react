# Hello Color App – React Client Extension (Demo)

This project demonstrates how to create a **React Custom Element Client Extension** in Liferay and pass widget properties into React to control **text color** and **text alignment**.

---

## How to Configure in Liferay

1. Add **Hello Color App** widget to any page.
2. Click widget → **⋮** → **Configuration** → **Properties**.
3. Add values in this format (one per line):

```text
color=green
alignment=left
```

### Examples

```text
color=pink
alignment=center
```

```text
color=#ff0000
alignment=right
```

Supported:

- **Color** → Any CSS color (`green`, `pink`, `#ff0000`, `rgb()`, etc.)
- **Alignment** → `left`, `center`, `right`, `justify`

Each widget instance can have its own values.

---

## Important File Changes

---

## 1. `client-extension.yaml`

Used to register the React application as a **Custom Element widget** and define **default properties**.

```yaml
properties:
  - color=blue
  - alignment=center
```

**Purpose:**
- Defines default property values.
- Makes properties available in the Liferay widget configuration UI.

---

## 2. `src/index.js`

This is where the **Custom Element reads properties from Liferay** and passes them into React.

```js
const color = this.getAttribute("color") || "blue";
const alignment = this.getAttribute("alignment") || "center";

this._root.render(
  <App color={color} alignment={alignment} />
);
```

**Purpose:**
- Reads values entered in Liferay widget properties.
- Sends them as props to the React component.

---

## 3. `src/App.js`

Receives the property values and **applies them as CSS styles**.

```js
export default function App({ color, alignment }) {
  return (
    <div style={{
      color,
      textAlign: alignment
    }}>
      Hello World
    </div>
  );
}
```

**Purpose:**

- Applies `color` to the **text color**
- Applies `alignment` to the **text alignment**

---

## Build & Deploy

Run from Liferay workspace root:

```bash
gw :client-extensions:hello-color-app:clean
gw :client-extensions:hello-color-app:deploy
```

After deployment, the widget appears in Page Builder.

---

## What This Demo Shows

- Creating a **React Custom Element Client Extension**
- Using **Widget Properties** for configuration
- Reading property values with `getAttribute()`
- Applying configurations dynamically in React
- Supporting multiple widget instances with different settings

---

