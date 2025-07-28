# Vercel Deployment Guide

## Prerequisites
- Node.js 18+ installed
- Vercel CLI installed (`npm i -g vercel`)
- GitHub account connected to Vercel

## Deployment Steps

### 1. Prepare Your Repository
Make sure your repository is pushed to GitHub with all the latest changes.

### 2. Deploy via Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Next.js
   - **Root Directory**: `tictactoe_DApp`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

### 3. Environment Variables (if needed)
If your app uses environment variables, add them in the Vercel dashboard:
- Go to your project settings
- Navigate to "Environment Variables"
- Add any required environment variables

### 4. Deploy via CLI (Alternative)

```bash
# Navigate to your project directory
cd tictactoe_DApp

# Install dependencies
npm install

# Deploy to Vercel
vercel

# Follow the prompts to configure your deployment
```

## Common Issues and Solutions

### Issue 1: Build Failures
- Ensure all dependencies are properly installed
- Check that Node.js version is 18+
- Verify that all imports are correct

### Issue 2: Runtime Errors
- Check browser console for client-side errors
- Ensure all environment variables are set
- Verify that all API endpoints are accessible

### Issue 3: Wallet Connection Issues
- Ensure your app is served over HTTPS (Vercel provides this)
- Check that wallet providers are properly configured
- Verify that contract addresses are correct for the deployed network

## Post-Deployment

1. Test all functionality on the deployed site
2. Check wallet connections work properly
3. Verify that the TicTacToe game functions correctly
4. Test on different browsers and devices

## Troubleshooting

If you encounter issues:

1. Check the Vercel deployment logs
2. Verify all dependencies are in package.json
3. Ensure the build command works locally
4. Check that all environment variables are set
5. Verify that the app works in development mode

## Support

If you continue to have issues, check:
- Vercel documentation: https://vercel.com/docs
- Next.js deployment guide: https://nextjs.org/docs/deployment
- Your project's specific error logs in the Vercel dashboard 