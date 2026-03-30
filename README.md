# MotoStock – Motocross Inventory Manager

A modern web application for managing inventory at a motocross bike store.

![MotoStock screenshot](https://github.com/user-attachments/assets/6bf7b3ef-5de7-466d-8513-eb797d52888b)

## Features

- 📦 Browse all products in a responsive card grid
- ➕ Add new products (name, SKU, brand, category, price, quantity, description)
- ✏️ Edit any product's details
- 🗑️ Delete products with a confirmation dialog
- ± Increment / decrement quantity directly from each card
- 🔍 Live search by name, brand, or SKU
- 🏷️ Filter by category (Bikes, Helmets, Riding Gear, Protection, Tyres, Parts, Accessories)
- ⚠️ Low-stock and out-of-stock visual indicators
- 💾 JSON file-based local database with 20 pre-populated motocross products

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: JSON file (`db.json`) — no native compilation required
- **Frontend**: Vanilla HTML / CSS / JavaScript (zero build step)

## Getting Started

```bash
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

## Product Categories

| Category | Examples |
|---|---|
| Bikes | KTM 450 SX-F, Honda CRF450R, Yamaha YZ250F |
| Helmets | Fox Racing V3 RS, Bell MX-9 |
| Riding Gear | Fox 360 Jersey & Pants, Alpinestars Tech-7 Boots |
| Protection | Leatt Chest Protector, EVS Knee Brace |
| Tyres | Maxxis IT-R, Dunlop MX33 |
| Parts | RK Chain, Renthal Fatbar, Boyesen Reed Cage |
| Accessories | Pro Grip Grips, Acerbis Hand Guards, Polisport Plastics |

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/products` | List products (supports `?search=` and `?category=`) |
| `GET` | `/api/products/:id` | Get a single product |
| `POST` | `/api/products` | Create a product |
| `PUT` | `/api/products/:id` | Update a product |
| `DELETE` | `/api/products/:id` | Delete a product |
| `GET` | `/api/categories` | List all categories |