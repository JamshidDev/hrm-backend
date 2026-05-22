@extends('structure::layouts.master')

@section('content')
    <h1>Hello World</h1>

    <p>Module: {!! config('structure.name') !!}</p>
@endsection
