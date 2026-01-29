# Shipping (EnvioPack)

## Probar cotizacion

```bash
curl -X POST http://localhost:3000/api/shipping/quote \
  -H "Content-Type: application/json" \
  -d '{
    "destinationPostalCode": "1888",
    "weightKg": 1.2,
    "dimensionsCm": { "length": 30, "width": 20, "height": 10 },
    "declaredValue": 15000,
    "deliveryType": "any"
  }'
```

## Variables de entorno requeridas

- `ENVIOPACK_API_KEY`
- `ENVIOPACK_SECRET_KEY`
- `ENVIOPACK_ORIGIN_POSTAL_CODE`
- `SHIPPING_DEBUG` (opcional)
