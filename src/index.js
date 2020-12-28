import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';
import { 
  ApolloProvider,
  ApolloClient,
  createHttpLink,
  InMemoryCache, 
  split
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context'
import { WebSocketLink } from '@apollo/client/link/ws';
import { getMainDefinition } from '@apollo/client/utilities'
import { AUTH_TOKEN } from './constants';

import App from './components/App';

import './styles/index.css';

/**We create the httpLink that will connect our ApolloClient instance with the GraphQL API. The GraphQL server will be running on http://localhost:4000. */
const httpLink = createHttpLink({
  uri: 'http://localhost:4000'
});

// set authentication
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem(AUTH_TOKEN);

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : ''
    }
  };
});

/**We’re instantiating a WebSocketLink that knows about the subscriptions endpoint. 
 * The subscriptions endpoint in this case is similar to the HTTP endpoint, 
 * except that it uses the ws (WebSocket) protocol instead of http. 
 * Notice that we’re also authenticating the WebSocket connection with the user’s 
 * token that we retrieve from localStorage. */

const wsLink = new WebSocketLink({
  uri: `ws://localhost:4000/graphql`,
  options: {
    reconnect: true,
    connectionParams: {
      authToken: localStorage.getItem(AUTH_TOKEN)
    }
  }
});

/**split is used to “route” a request to a specific middleware link. 
 * It takes three arguments, the first one is a test function which returns a boolean. 
 * The remaining two arguments are again of type ApolloLink. 
 * If test returns true, the request will be forwarded to the link passed as the second argument. 
 * If false, to the third one. */
const link = split(
  ({ query }) => {
    const { kind, operation } = getMainDefinition(query);

    return (
      kind === 'OperationDefinition' &&
      operation === 'subscription'
    );
  },
  wsLink,
  authLink.concat(httpLink)
);

// instantiation of apollo client
// const client = new ApolloClient({
//   link: authLink.concat(httpLink),
//   cache: new InMemoryCache()
// });

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

/** wrap the App with BrowserRouter so that all child components of App will get access to the routing functionality. */
ReactDOM.render(
  <BrowserRouter>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>,
  </BrowserRouter>,
  document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
