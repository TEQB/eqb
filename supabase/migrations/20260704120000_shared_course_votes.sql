CREATE TABLE shared_course_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('join', 'leave')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_shared_course_requests_course ON shared_course_requests(course_id);
CREATE INDEX idx_shared_course_requests_programme ON shared_course_requests(programme_id);
CREATE INDEX idx_shared_course_requests_status ON shared_course_requests(status);

CREATE TABLE shared_course_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES shared_course_requests(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('approve', 'reject')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(request_id, voter_id)
);

CREATE INDEX idx_shared_course_votes_request ON shared_course_votes(request_id);

ALTER TABLE shared_course_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_course_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can read their programme's requests"
  ON shared_course_requests FOR SELECT
  TO authenticated
  USING (
    programme_id = (
      SELECT programme_id FROM profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert requests"
  ON shared_course_requests FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update requests"
  ON shared_course_requests FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Students can read votes for their programme's requests"
  ON shared_course_votes FOR SELECT
  TO authenticated
  USING (
    request_id IN (
      SELECT id FROM shared_course_requests
      WHERE programme_id = (
        SELECT programme_id FROM profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Students can insert their own votes"
  ON shared_course_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    voter_id = (SELECT id FROM profiles WHERE auth_user_id = auth.uid())
    AND request_id IN (
      SELECT id FROM shared_course_requests
      WHERE programme_id = (
        SELECT programme_id FROM profiles WHERE auth_user_id = auth.uid()
      )
      AND status = 'pending'
    )
  );
