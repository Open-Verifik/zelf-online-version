# Stripe Webhooks Module

This module handles Stripe webhook events for payment processing and subscription management.

## Endpoint

- **URL**: `POST /api/webhook`
- **Access**: Unprotected (public endpoint for Stripe)
- **Authentication**: Stripe signature verification

## Supported Events

The webhook handles the most common Stripe events:

### Payment Events
- `invoice.payment_succeeded` - Successful invoice payment
- `invoice.payment_failed` - Failed invoice payment
- `payment_intent.succeeded` - Successful payment intent
- `payment_intent.payment_failed` - Failed payment intent

### Subscription Events
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription updated
- `customer.subscription.deleted` - Subscription canceled/deleted

### Checkout Events
- `checkout.session.completed` - Checkout session completed

## Environment Variables Required

```bash
STRIPE_SECRET_KEY=sk_test_... # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret from Stripe dashboard
```

## Webhook Setup in Stripe Dashboard

1. Go to Stripe Dashboard > Webhooks
2. Create new endpoint: `https://your-domain.com/api/webhook`
3. Select events to listen for:
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
4. Copy the webhook secret and add to environment variables

## Security

- All webhook requests are validated using Stripe signature verification
- Invalid signatures are rejected with 400 status
- Missing webhook secret configuration returns 500 status

## TODO Implementation Points

The webhook handlers include TODO comments for:
- Saving payment data to database
- Updating user subscription status
- Sending confirmation emails
- Handling payment failures
- Implementing retry logic
- Updating localStorage subscription status

## File Structure

```
Repositories/Stripe/
├── routes/
│   └── stripe.routes.js          # Webhook route definitions
├── controllers/
│   └── stripe.controller.js       # Webhook request handling
├── middlewares/
│   └── stripe.middleware.js      # Signature validation
└── modules/
    └── stripe.module.js          # Event processing logic
```
