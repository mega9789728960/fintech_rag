-- Run this in your Supabase SQL Editor to set up the pgvector database for RAG
-- Model: gemini-embedding-001 (3072 dimensions, using halfvec for HNSW compatibility)

-- 1. Enable the pgvector extension to work with embedding vectors
create extension if not exists vector;

-- 2. Drop old table if exists (to handle dimension change and type change)
drop table if exists document_chunks;

-- 3. Create the document chunks table using halfvec
create table document_chunks (
    id bigserial primary key,
    document_name text not null,
    chunk_index integer not null,
    text_content text not null,
    -- Use halfvec to store 3072 dimensions within PostgreSQL's 8KB page limit
    embedding halfvec(3072) 
);

-- 4. Create an index for faster similarity searches using halfvec operations
create index on document_chunks using hnsw (embedding halfvec_cosine_ops);

-- 5. Create a match function for semantic search
create or replace function match_document_chunks (
    -- Input must also be cast as halfvec
    query_embedding halfvec(3072), 
    match_threshold float,
    match_count int,
    filter_documents text[] default null
)
returns table (
    id bigint,
    document_name text,
    chunk_index int,
    text_content text,
    similarity float
)
language sql stable
as $$
    select
        id,
        document_name,
        chunk_index,
        text_content,
        1 - (embedding <=> query_embedding) as similarity
    from document_chunks
    where 1 - (embedding <=> query_embedding) > match_threshold
      and (filter_documents is null or document_name = any(filter_documents))
    order by embedding <=> query_embedding
    limit match_count;
$$;
