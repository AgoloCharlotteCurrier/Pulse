const express = require('express');
const axios = require('axios');
const OpenAI = require('openai');
const { getDB } = require('../database');
const { getApiKey } = require('./settings');

const router = express.Router();

// Main search endpoint
router.post('/', async (req, res) => {
  const { topic, timeRange } = req.body;
  
  try {
    console.log(`Starting search for topic: "${topic}", time range: ${timeRange}`);
    
    // Get API keys
    const [twitterToken, redditClientId, redditSecret, openaiKey] = await Promise.all([
      getApiKey('twitter_bearer_token'),
      getApiKey('reddit_client_id'),
      getApiKey('reddit_client_secret'),
      getApiKey('openai_api_key')
    ]);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '2_days':
        startDate.setDate(endDate.getDate() - 2);
        break;
      case '7_days':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '14_days':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '30_days':
        startDate.setDate(endDate.getDate() - 30);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }
    
    // Search platforms in parallel
    const searchPromises = [];
    
    if (twitterToken) {
      searchPromises.push(searchTwitter(topic, startDate, endDate, twitterToken));
    }
    
    if (redditClientId && redditSecret) {
      searchPromises.push(searchReddit(topic, startDate, endDate, redditClientId, redditSecret));
    }
    
    const results = await Promise.allSettled(searchPromises);
    
    // Combine all results
    let allPosts = [];
    results.forEach(result => {
      if (result.status === 'fulfilled' && result.value) {
        allPosts = allPosts.concat(result.value);
      }
    });
    
    console.log(`Found ${allPosts.length} total posts`);
    
    // Generate AI synthesis
    let synthesis = null;
    if (openaiKey && allPosts.length > 0) {
      synthesis = await generateSynthesis(allPosts, topic, openaiKey);
    }
    
    // Save to database
    const searchRunId = await saveSearchRun(topic, timeRange, allPosts, synthesis);
    
    res.json({
      id: searchRunId,
      topic,
      timeRange,
      posts: allPosts,
      synthesis,
      totalPosts: allPosts.length
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

async function searchTwitter(topic, startDate, endDate, bearerToken) {
  try {
    const query = `${topic} -is:retweet lang:en`;
    const startTime = startDate.toISOString();
    const endTime = endDate.toISOString();
    
    const response = await axios.get('https://api.twitter.com/2/tweets/search/recent', {
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      },
      params: {
        query,
        start_time: startTime,
        end_time: endTime,
        max_results: 100,
        'tweet.fields': 'created_at,author_id,public_metrics,context_annotations',
        'user.fields': 'username,name',
        expansions: 'author_id'
      }
    });
    
    const tweets = response.data.data || [];
    const users = response.data.includes?.users || [];
    const userMap = users.reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
    
    return tweets.map(tweet => ({
      source: 'twitter',
      title: tweet.text.substring(0, 100) + (tweet.text.length > 100 ? '...' : ''),
      content: tweet.text,
      author: userMap[tweet.author_id]?.username || 'unknown',
      date: tweet.created_at,
      engagement_metrics: JSON.stringify({
        likes: tweet.public_metrics?.like_count || 0,
        retweets: tweet.public_metrics?.retweet_count || 0,
        replies: tweet.public_metrics?.reply_count || 0
      }),
      url: `https://twitter.com/${userMap[tweet.author_id]?.username}/status/${tweet.id}`
    }));
  } catch (error) {
    console.error('Twitter search error:', error.response?.data || error.message);
    return [];
  }
}

async function searchReddit(topic, startDate, endDate, clientId, clientSecret) {
  try {
    // Get Reddit access token
    const authResponse = await axios.post('https://www.reddit.com/api/v1/access_token', 
      'grant_type=client_credentials',
      {
        auth: {
          username: clientId,
          password: clientSecret
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Pulse/1.0.0'
        }
      }
    );
    
    const accessToken = authResponse.data.access_token;
    
    // Search Reddit
    const response = await axios.get('https://oauth.reddit.com/search', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'Pulse/1.0.0'
      },
      params: {
        q: topic,
        sort: 'new',
        limit: 100,
        type: 'link,sr'
      }
    });
    
    const posts = response.data.data?.children || [];
    
    return posts.map(post => {
      const data = post.data;
      return {
        source: 'reddit',
        title: data.title,
        content: data.selftext || data.title,
        author: data.author,
        date: new Date(data.created_utc * 1000).toISOString(),
        engagement_metrics: JSON.stringify({
          upvotes: data.ups || 0,
          comments: data.num_comments || 0,
          score: data.score || 0
        }),
        url: `https://reddit.com${data.permalink}`
      };
    }).filter(post => {
      const postDate = new Date(post.date);
      return postDate >= startDate && postDate <= endDate;
    });
  } catch (error) {
    console.error('Reddit search error:', error.response?.data || error.message);
    return [];
  }
}

async function generateSynthesis(posts, topic, openaiKey) {
  try {
    const openai = new OpenAI({ apiKey: openaiKey });
    
    const postsText = posts.map(post => 
      `Source: ${post.source}\nAuthor: ${post.author}\nContent: ${post.content}\nEngagement: ${post.engagement_metrics}\n---`
    ).join('\n\n');
    
    const prompt = `Analyze the following social media posts about "${topic}" and provide a structured summary:

${postsText}

Please provide a JSON response with the following structure:
{
  "key_themes": ["theme1", "theme2", "theme3"],
  "pain_points": ["pain1", "pain2", "pain3"],
  "sentiment": "positive/neutral/negative",
  "notable_quotes": [
    {"text": "quote text", "author": "author", "source": "twitter/reddit"},
    ...
  ],
  "engagement_summary": {
    "high_engagement_posts": number,
    "total_interactions": number,
    "average_sentiment": "description"
  },
  "summary": "2-3 sentence overview of the main findings"
}

Focus on extracting actionable insights and trends from the data.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert social media analyst. Always respond with valid JSON." },
        { role: "user", content: prompt }
      ],
      temperature: 0.3
    });
    
    const synthesisText = completion.choices[0].message.content;
    return JSON.parse(synthesisText);
    
  } catch (error) {
    console.error('Synthesis error:', error);
    return {
      key_themes: ["Analysis failed"],
      pain_points: ["Could not generate synthesis"],
      sentiment: "unknown",
      notable_quotes: [],
      engagement_summary: {
        high_engagement_posts: 0,
        total_interactions: 0,
        average_sentiment: "unknown"
      },
      summary: "AI synthesis was not available for this search."
    };
  }
}

async function saveSearchRun(topic, timeRange, posts, synthesis) {
  return new Promise((resolve, reject) => {
    const db = getDB();
    
    db.run(
      `INSERT INTO search_runs (topic, time_range, raw_results, synthesis) 
       VALUES (?, ?, ?, ?)`,
      [topic, timeRange, JSON.stringify(posts), JSON.stringify(synthesis)],
      function(err) {
        if (err) {
          reject(err);
        } else {
          // Save individual posts
          const searchRunId = this.lastID;
          
          const stmt = db.prepare(`
            INSERT INTO raw_posts (search_run_id, source, title, content, author, date, engagement_metrics, url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          
          posts.forEach(post => {
            stmt.run([
              searchRunId,
              post.source,
              post.title,
              post.content,
              post.author,
              post.date,
              post.engagement_metrics,
              post.url
            ]);
          });
          
          stmt.finalize();
          resolve(searchRunId);
        }
      }
    );
  });
}

module.exports = router;