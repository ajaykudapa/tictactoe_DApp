#!/bin/bash

echo "🚀 Starting Vercel deployment for TicTacToe DApp..."

# Navigate to the Next.js app directory
cd tictactoe_DApp

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🎯 Ready for deployment!"
    echo ""
    echo "To deploy to Vercel:"
    echo "1. Go to https://vercel.com"
    echo "2. Click 'New Project'"
    echo "3. Import your GitHub repository"
    echo "4. Set Root Directory to: tictactoe_DApp"
    echo "5. Deploy!"
    echo ""
    echo "Or use Vercel CLI:"
    echo "cd tictactoe_DApp && vercel"
else
    echo "❌ Build failed! Please fix the errors above."
    exit 1
fi 