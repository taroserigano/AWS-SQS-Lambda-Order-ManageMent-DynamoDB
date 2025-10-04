# Order Management Frontend

A React TypeScript frontend for the AWS SQS Order Management System.

<img width="1102" height="1045" alt="image" src="https://github.com/user-attachments/assets/a16e55b3-44b6-4fa2-ad4a-a245d4c3d577" />
<img width="1300" height="1079" alt="image" src="https://github.com/user-attachments/assets/0cb7c819-530f-451b-848c-2beac2bae726" />


## Features

- 🛒 **Order Submission**: Submit orders to AWS SQS queue via API Gateway
- 📋 **Order History**: View submitted orders with real-time status updates
- 🎨 **Modern UI**: Clean, responsive design with animations
- 🔄 **Real-time Updates**: Visual feedback for order processing stages
- 📱 **Mobile Friendly**: Responsive design that works on all devices

## API Configuration

The frontend is configured to connect to your AWS API Gateway endpoint:

- **Base URL**: `https://u62q7jktce.execute-api.us-east-2.amazonaws.com/prod`
- **Orders Endpoint**: `POST /orders`

To change the API endpoint, edit the `API_BASE_URL` in `src/services/api.ts`.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
