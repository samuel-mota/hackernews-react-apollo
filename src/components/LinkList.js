import React from 'react';
import { useQuery, gql } from '@apollo/client';
import { useHistory } from 'react-router';

import { LINKS_PER_PAGE } from '../constants';

import Link from './Link';

/**The query now accepts arguments that we’ll use to implement pagination and ordering. skip defines the offset where the query will start. For example, if we passed a value of 10 for this argument, it means that the first 10 items of the list will not be included in the response. take then defines the limit or how many elements we want to load from that list. If we pass in 10 for skip and 5 for first, we’ll receive items 10 to 15 from the list. orderBy defines how the returned list should be sorted. */
export const FEED_QUERY = gql`
  query FeedQuery (
    $take: Int
    $skip: Int
    $orderBy: LinkOrderByInput
  ) {
    feed (
      take: $take, 
      skip: $skip, 
      orderBy: $orderBy
    ) {
      id
      links {
        id
        createdAt
        url
        description
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      count
    }
  }
`;

const NEW_LINKS_SUBSCRIPTION = gql`
  subscription {
    newLink {
      id
      url
      description
      createdAt
      postedBy {
        id
        name
      }
      votes {
        id
        user {
          id
        }
      }
    }
  }
`;

const NEW_VOTES_SUBSCRIPTION = gql`
  subscription {
    newVote {
      id
      link {
        id
        url
        description
        createdAt
        postedBy {
          id
          name
        }
        votes {
          id
          user {
            id
          }
        }
      }
      user {
        id
      }
    }
  }
`;

/**The getQueryVariables function is responsible for returning values for skip, take, and orderBy. For skip, we first check whether we are currently on the /new route. If so, the value for skip is the current page (subtracting 1 to handle the index) multiplied by the LINKS_PER_PAGE contstant. If we’re not on the /new route, the value for skip is 0. We use the same LINKS_PER_PAGE constant to determine how many links to take.

We’re now passing take, skip, orderBy values as variables based on the current page.

Also note that we’re including the ordering attribute { createdAt: 'desc' } for the new page to make sure the newest links are displayed first. The ordering for the /top route will be calculated manually based on the number of votes for each link. */

const getQueryVariables = (isNewPage, page) => {
  const skip = isNewPage ? (page - 1) * LINKS_PER_PAGE : 0;
  const take = isNewPage ? LINKS_PER_PAGE : 100;
  const orderBy = { createdAt: 'desc' };
  
  return { take, skip, orderBy };
}

const getLinksToRender = (isNewPage, data) => {
  if (isNewPage) {
    return data.feed.links;
  }

  const rankedLinks = data.feed.links.slice();
  rankedLinks.sort((l1, l2) => l2.votes.length - l1.votes.length);
  
  return rankedLinks;
}


const LinkList = () => {
  const history = useHistory();
  const isNewPage = history.location.pathname.includes('new');
  const pageIndexParams = history.location.pathname.split('/');
  const page = parseInt(pageIndexParams[pageIndexParams.length - 1]);
  const pageIndex = page ? (page - 1) * LINKS_PER_PAGE : 0;

  const { 
    data,
    loading,
    error,
    subscribeToMore
  } = useQuery(FEED_QUERY, {
    variables: getQueryVariables(isNewPage, page)
  });

  /**The subscribeToMore function takes a single object as an argument. This object requires configuration for how to listen for and respond to a subscription.

At the very least, we need to pass a subscription document to the document key in this object. This is a GraphQL document where we define our subscription.

We can also pass a field called updateQuery which can be used to update the cache, much like we would do in a mutation. */

  subscribeToMore({
    document: NEW_LINKS_SUBSCRIPTION,
    updateQuery: (prev, { subscriptionData }) => {
      if (!subscriptionData.data) return prev;
      const newLink = subscriptionData.data.newLink;
      const exists = prev.feed.links.find(({ id }) => id === newLink.id); 
      
      if (exists) return prev;

      return Object.assign({}, prev, {
        feed: {
          links: [newLink, ...prev.feed.links],
          count: prev.feed.links.length + 1,
          __typename: prev.feed.__typename
        }
      });
    }
  });

  subscribeToMore({
    document: NEW_VOTES_SUBSCRIPTION
  });


  return (
    <>
    {loading && <p>Loading...</p>}
    {error && <pre>{JSON.stringify(error, null, 2)}</pre>}
    {data && (
      <>
        {getLinksToRender(isNewPage, data).map(
          (link, index) => (
            <Link
              key={link.id}
              link={link}
              index={index + pageIndex}
            />
          )
        )}
        {isNewPage && (
          <div className="flex ml4 mv3 gray">
            <div
              className="pointer mr2"
              onClick={() => {
                if (page > 1) {
                  history.push(`/new/${page - 1}`);
                }
              }}
            >
              Previous
            </div>
            <div
              className="pointer"
              onClick={() => {
                if (
                  page <=
                  data.feed.count / LINKS_PER_PAGE
                ) {
                  const nextPage = page + 1;
                  history.push(`/new/${nextPage}`);
                }
              }}
            >
              Next
            </div>
          </div>
        )}
      </>
    )}
    </>
  );
};

export default LinkList;